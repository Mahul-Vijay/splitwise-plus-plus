export type SessionUser = {
  userId: string;
  email: string;
  name: string;
};

export type GroupSummary = {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
  expenseCount: number;
  role: string;
};

export type Member = {
  id: string;
  name: string;
  email: string;
};

export type ExpenseShare = {
  id: string;
  userId: string;
  shareCents: number;
  user: { id: string; name: string };
};

export type Expense = {
  id: string;
  description: string;
  amountCents: number;
  category: string;
  createdAt: string;
  paidBy: { id: string; name: string };
  shares: ExpenseShare[];
};

export type GroupDetail = {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  members: { id: string; role: string; user: Member }[];
  expenses: Expense[];
};

export type Balance = {
  userId: string;
  name: string;
  netCents: number;
};

export type SimplifiedTransaction = {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amountCents: number;
};

export type Settlement = {
  id: string;
  amountCents: number;
  createdAt: string;
  fromUser: { id: string; name: string };
  toUser: { id: string; name: string };
};
