import { IsEnum } from 'class-validator';

export enum ConversationLifecycleAction {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  RESOLVE = 'RESOLVE',
  CLOSE = 'CLOSE',
  REOPEN = 'REOPEN',
}

export class TransitionConversationDto {
  @IsEnum(ConversationLifecycleAction)
  action!: ConversationLifecycleAction;
}
