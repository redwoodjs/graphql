type DefaultQueryErrorProps = {
  readonly message: string;
};

export const DefaultQueryError = ({ message }: DefaultQueryErrorProps) => (
  <div style={{ color: "red" }}>Error: {message}</div>
);

export const DefaultGraphqlEmpty = () => <div>Empty</div>;
