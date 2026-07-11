export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  BigInt: number;
  Date: string;
  DateTime: string;
  JSON: Record<string, unknown>;
  JSONObject: Record<string, unknown>;
  Time: string;
};

export type Mutation = {
  __typename?: 'Mutation';
  createTodo?: Maybe<Todo>;
};


export type MutationcreateTodoArgs = {
  body: Scalars['String'];
};

export type Query = {
  __typename?: 'Query';
  redwood?: Maybe<Redwood>;
};

export type Redwood = {
  __typename?: 'Redwood';
  currentUser?: Maybe<Scalars['JSON']>;
  prismaVersion?: Maybe<Scalars['String']>;
  version?: Maybe<Scalars['String']>;
};

export type Todo = {
  __typename?: 'Todo';
  body: Scalars['String'];
  id: Scalars['Int'];
  status: Scalars['String'];
};

export type AddTodo_CreateTodo_CellVariables = Exact<{
  body: Scalars['String'];
}>;


export type AddTodo_CreateTodo_Cell = { __typename?: 'Mutation', createTodo?: { __typename?: 'Todo', id: number, body: string } | null };
