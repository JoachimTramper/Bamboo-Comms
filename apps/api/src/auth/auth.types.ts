export type AuthSubjectType = 'user' | 'customer';

export type AuthUserPrincipal = {
  sub: string;
  email: string;
  subjectType: 'user';
};

export type AuthCustomerPrincipal = {
  sub: string;
  email: string | null;
  subjectType: 'customer';
};

export type AuthPrincipal = AuthUserPrincipal | AuthCustomerPrincipal;

export type AuthJwtPayload = {
  sub: string;
  email?: string | null;
  subjectType?: AuthSubjectType;
};
