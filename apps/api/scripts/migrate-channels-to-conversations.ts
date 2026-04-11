import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const BOT_EMAILS = new Set(['bot@ai.local']);

type PlanMode = 'plan' | 'execute';
type ChannelMigrationKind =
  | 'internal_conversation'
  | 'customer_conversation_candidate'
  | 'skip';

type ChannelWithMembers = Awaited<
  ReturnType<typeof loadChannels>
>[number];

type PlannedConversation = {
  channelId: string;
  channelName: string;
  kind: ChannelMigrationKind;
  reason: string;
  memberIds: string[];
  messageCount: number;
  proposedConversation: {
    subject: string | null;
    customerEmail: string | null;
    assigneeEmail: string | null;
    status: 'OPEN';
    priority: 'NORMAL';
    tags: string[];
  } | null;
};

function parseMode(argv: string[]): PlanMode {
  return argv.includes('--execute') ? 'execute' : 'plan';
}

function isBotUser(user: { email: string }) {
  return BOT_EMAILS.has(user.email.toLowerCase());
}

function makeSubject(channel: { name: string; isDirect: boolean }) {
  if (channel.isDirect) return `Imported DM: ${channel.name}`;
  return `Imported channel: ${channel.name}`;
}

async function loadChannels() {
  return prisma.channel.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      isDirect: true,
      createdAt: true,
      members: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });
}

function classifyChannel(channel: ChannelWithMembers): PlannedConversation {
  const activeMembers = channel.members.filter((member) => !isBotUser(member));
  const adminMembers = activeMembers.filter((member) => member.role === Role.ADMIN);
  const nonAdminMembers = activeMembers.filter(
    (member) => member.role !== Role.ADMIN,
  );

  if (!channel.isDirect) {
    return {
      channelId: channel.id,
      channelName: channel.name,
      kind: 'internal_conversation',
      reason: 'Public channel maps to an internal support/team conversation.',
      memberIds: activeMembers.map((member) => member.id),
      messageCount: channel._count.messages,
      proposedConversation: {
        subject: makeSubject(channel),
        customerEmail: null,
        assigneeEmail: adminMembers[0]?.email ?? null,
        status: 'OPEN',
        priority: 'NORMAL',
        tags: ['imported', 'internal'],
      },
    };
  }

  if (activeMembers.length === 2 && adminMembers.length >= 1) {
    return {
      channelId: channel.id,
      channelName: channel.name,
      kind: 'customer_conversation_candidate',
      reason:
        'Direct message with an admin participant is a candidate for a customer conversation.',
      memberIds: activeMembers.map((member) => member.id),
      messageCount: channel._count.messages,
      proposedConversation: {
        subject: makeSubject(channel),
        customerEmail: nonAdminMembers[0]?.email ?? null,
        assigneeEmail: adminMembers[0]?.email ?? null,
        status: 'OPEN',
        priority: 'NORMAL',
        tags: ['imported', 'dm-candidate'],
      },
    };
  }

  return {
    channelId: channel.id,
    channelName: channel.name,
    kind: 'skip',
    reason:
      'Direct message does not match the safe import heuristic and should be reviewed manually before migration.',
    memberIds: activeMembers.map((member) => member.id),
    messageCount: channel._count.messages,
    proposedConversation: null,
  };
}

function printPlanSummary(plan: PlannedConversation[]) {
  const internal = plan.filter((item) => item.kind === 'internal_conversation');
  const customerCandidates = plan.filter(
    (item) => item.kind === 'customer_conversation_candidate',
  );
  const skipped = plan.filter((item) => item.kind === 'skip');

  console.log('Channel -> Conversation migration plan');
  console.log('Mode: dry-run only');
  console.log(`Total channels inspected: ${plan.length}`);
  console.log(`Internal conversation candidates: ${internal.length}`);
  console.log(`Customer conversation candidates: ${customerCandidates.length}`);
  console.log(`Skipped for manual review: ${skipped.length}`);
  console.log('');

  for (const item of plan) {
    console.log(`- [${item.kind}] ${item.channelName} (${item.channelId})`);
    console.log(`  Reason: ${item.reason}`);
    console.log(`  Members: ${item.memberIds.length}`);
    console.log(`  Messages: ${item.messageCount}`);

    if (item.proposedConversation) {
      console.log(
        `  Proposed: subject="${item.proposedConversation.subject ?? ''}", customer=${item.proposedConversation.customerEmail ?? 'n/a'}, assignee=${item.proposedConversation.assigneeEmail ?? 'n/a'}`,
      );
    } else {
      console.log('  Proposed: manual review required');
    }
  }
}

async function main() {
  const mode = parseMode(process.argv.slice(2));

  if (mode === 'execute') {
    throw new Error(
      'Execution mode is intentionally disabled in Step 2. This script only builds and prints a migration plan.',
    );
  }

  const channels = await loadChannels();
  const plan = channels.map(classifyChannel);

  printPlanSummary(plan);

  console.log('');
  console.log('No database writes were performed.');
  console.log(
    'Next safe step: review the dry-run output, confirm classification rules, then implement a transactional execute path later.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
