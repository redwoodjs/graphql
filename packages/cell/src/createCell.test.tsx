import type React from "react";

import type { OperationVariables, TypedDocumentNode } from "@apollo/client";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, expectTypeOf, test, vi } from "vite-plus/test";

import { createCell } from "./createCell.js";
import type { CellQueryResult } from "./types.js";

vi.mock("@apollo/client/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@apollo/client/react")>();

  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

type TestVariables = {
  readonly id: number;
};

type TestData = {
  readonly answer: string;
};

const TEST_QUERY: TypedDocumentNode<TestData, TestVariables> = gql`
  query TestQuery($id: Int!) {
    answer(id: $id)
  }
`;

describe("createCell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders Loading while the query is loading without data", () => {
    mockUseQuery({ loading: true });

    const TestCell = createCell<TestData, TestVariables>({
      QUERY: TEST_QUERY,
      Loading: () => <>Fetching...</>,
      Success: ({ answer }) => <>{answer}</>,
    });

    render(<TestCell id={1} />);

    screen.getByText("Fetching...");
  });

  test("passes props as variables by default", () => {
    mockUseQuery({ data: { answer: "Hello Bob" }, loading: false });

    const TestCell = createCell<TestData, TestVariables>({
      QUERY: TEST_QUERY,
      Success: ({ answer }) => <>{answer}</>,
    });

    render(
      <TestCell id={7}>
        <span>child</span>
      </TestCell>,
    );

    expect(useQuery).toHaveBeenCalledWith(TEST_QUERY, {
      fetchPolicy: "cache-first",
      variables: { id: 7 },
    });
    screen.getByText("Hello Bob");
  });

  test("uses explicit variables props when provided", () => {
    mockUseQuery({ data: { answer: "From variables prop" }, loading: false });

    const TestCell = createCell<TestData, TestVariables>({
      QUERY: TEST_QUERY,
      Success: ({ answer }) => <>{answer}</>,
    });

    render(<TestCell variables={{ id: 9 }} />);

    expect(useQuery).toHaveBeenCalledWith(TEST_QUERY, {
      fetchPolicy: "cache-first",
      variables: { id: 9 },
    });
  });

  test("passes variables and Apollo options from beforeQuery", () => {
    mockUseQuery({ data: { answer: "From beforeQuery" }, loading: false });

    const TestCell = createCell<TestData, TestVariables, { readonly label: string }>({
      QUERY: TEST_QUERY,
      beforeQuery: ({ label }) => ({
        variables: { id: label.length },
        fetchPolicy: "cache-and-network",
        notifyOnNetworkStatusChange: true,
      }),
      Success: ({ answer, label }) => (
        <>
          {label}: {answer}
        </>
      ),
    });

    render(<TestCell label="hello" />);

    expect(useQuery).toHaveBeenCalledWith(TEST_QUERY, {
      variables: { id: 5 },
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
    });
    screen.getByText("hello: From beforeQuery");
  });

  test("supports QUERY as a function of cell props", () => {
    mockUseQuery({ data: { answer: "Dynamic" }, loading: false });

    const otherQuery: TypedDocumentNode<TestData, TestVariables> = gql`
      query OtherQuery($id: Int!) {
        answer(id: $id)
      }
    `;

    const TestCell = createCell<TestData, TestVariables, { readonly useOtherQuery: boolean }>({
      QUERY: ({ useOtherQuery }) => (useOtherQuery ? otherQuery : TEST_QUERY),
      Success: ({ answer }) => <>{answer}</>,
    });

    render(<TestCell id={1} useOtherQuery />);

    expect(useQuery).toHaveBeenCalledWith(otherQuery, {
      fetchPolicy: "cache-first",
      variables: { id: 1, useOtherQuery: true },
    });
  });

  test("renders Success for stale data while loading", () => {
    const queryResult = mockUseQuery({
      data: { answer: "Stale answer" },
      loading: true,
    });

    const TestCell = createCell<TestData, TestVariables>({
      QUERY: TEST_QUERY,
      Loading: () => <>Fetching...</>,
      Success: ({ answer, queryResult }) => (
        <>
          {answer}:{String(queryResult?.loading)}
        </>
      ),
    });

    render(<TestCell id={1} />);

    screen.getByText("Stale answer:true");
    expect(queryResult.loading).toBe(true);
  });

  test("renders Failure with error, errorCode, and queryResult", () => {
    const error = new Error("No config");
    Object.defineProperty(error, "graphQLErrors", {
      value: [{ message: "No config", extensions: { code: "NO_CONFIG" } }],
    });
    mockUseQuery({ error, loading: false });

    const TestCell = createCell<TestData, TestVariables>({
      QUERY: TEST_QUERY,
      Failure: ({ error, errorCode, queryResult }) => (
        <>
          {error.message}:{errorCode}:{String(queryResult?.error?.message)}
        </>
      ),
      Success: ({ answer }) => <>{answer}</>,
    });

    render(<TestCell id={1} />);

    screen.getByText("No config:NO_CONFIG:No config");
  });

  test("throws query errors when Failure is omitted", () => {
    const error = new Error("Exploded");
    mockUseQuery({ error, loading: false });

    const TestCell = createCell<TestData, TestVariables>({
      QUERY: TEST_QUERY,
      Success: ({ answer }) => <>{answer}</>,
    });

    const originalConsoleError = console.error;
    console.error = vi.fn();

    try {
      expect(() => render(<TestCell id={1} />)).toThrow("Exploded");
    } finally {
      console.error = originalConsoleError;
    }
  });

  test("uses the configured displayName", () => {
    mockUseQuery({ data: { answer: "Named" }, loading: false });

    const TestCell = createCell<TestData, TestVariables>({
      QUERY: TEST_QUERY,
      displayName: "NamedCell",
      Success: ({ answer }) => <>{answer}</>,
    });

    expect(TestCell.displayName).toBe("NamedCell");
  });
});

function mockUseQuery<TData extends object, TVariables extends OperationVariables>(
  result: Partial<CellQueryResult<TData, TVariables>>,
) {
  const queryResult = result as CellQueryResult<TData, TVariables>;

  vi.mocked(useQuery<TData, TVariables>).mockReturnValue(queryResult);

  return queryResult;
}

type TypeTestVariables = {
  readonly id: number;
};

type TypeTestData = {
  readonly answer: string;
};

describe("cell types", () => {
  test("allow explicit variables as an alternative component input", () => {
    const TestCell = createCell<TypeTestData, TypeTestVariables>({
      QUERY: TEST_QUERY,
      Success: ({ answer }) => answer,
    });

    expectTypeOf<{
      readonly variables: TypeTestVariables;
    }>().toMatchTypeOf<React.ComponentProps<typeof TestCell>>();
  });
});
