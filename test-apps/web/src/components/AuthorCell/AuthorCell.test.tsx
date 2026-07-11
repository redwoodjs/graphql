import { render } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { Empty, Failure, Loading, Success } from "./AuthorCell";
import { standard } from "./AuthorCell.mock";

describe("AuthorCell", () => {
  it("renders Loading successfully", () => {
    expect(() => {
      render(<Loading />);
    }).not.toThrow();
  });

  it("renders Empty successfully", () => {
    expect(() => {
      render(<Empty />);
    }).not.toThrow();
  });

  it("renders Failure successfully", () => {
    expect(() => {
      render(<Failure error={new Error("Oh no")} variables={{ id: 42 }} />);
    }).not.toThrow();
  });

  it("renders Success successfully", () => {
    expect(() => {
      render(<Success author={standard().author} variables={{ id: 42 }} />);
    }).not.toThrow();
  });
});
