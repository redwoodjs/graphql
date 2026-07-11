import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import {
  checkboxInputTag,
  formatEnum,
  jsonDisplay,
  jsonTruncate,
  timeTag,
  truncate,
} from "./formatters";

describe("formatEnum", () => {
  it("handles nullish values", () => {
    expect(formatEnum(null)).toEqual("");
    expect(formatEnum("")).toEqual("");
    expect(formatEnum(undefined)).toEqual("");
  });

  it("formats a list of values", () => {
    expect(formatEnum(["RED", "ORANGE", "YELLOW", "GREEN", "BLUE", "VIOLET"])).toEqual(
      "Red, Orange, Yellow, Green, Blue, Violet",
    );
  });

  it("formats a single value", () => {
    expect(formatEnum("DARK_BLUE")).toEqual("Dark blue");
  });

  it("returns an empty string for values of the wrong type (for JS projects)", () => {
    // @ts-expect-error - Testing JS scenario
    expect(formatEnum(5)).toEqual("");
  });
});

describe("truncate", () => {
  it("truncates really long strings", () => {
    expect(truncate("na ".repeat(1000) + "batman").length).toBeLessThan(1000);
    expect(truncate("na ".repeat(1000) + "batman")).not.toMatch(/batman/);
  });

  it("does not modify short strings", () => {
    expect(truncate("Short strinG")).toEqual("Short strinG");
  });

  it("adds ... to the end of truncated strings", () => {
    expect(truncate("repeat".repeat(1000))).toMatch(/\w\.\.\.$/);
  });

  it("accepts numbers", () => {
    expect(truncate(123)).toEqual("123");
    expect(truncate(0)).toEqual("0");
    expect(truncate(0o000)).toEqual("0");
  });

  it("handles arguments of invalid type", () => {
    // @ts-expect-error - Testing JS scenario
    expect(truncate(false)).toEqual("false");

    // @ts-expect-error - Testing JS scenario
    expect(truncate(undefined)).toEqual("");
    // @ts-expect-error - Testing JS scenario
    expect(truncate(null)).toEqual("");
  });
});

describe("jsonTruncate", () => {
  it("truncates large json structures", () => {
    const truncated = jsonTruncate({
      bar: "bar",
      baz: "baz",
      bazinga: "Sheldon",
      bool: false,
      five: 5,
      foo: "foo",
      kittens: "kittens meow",
      nested: {
        foobar: "I have no imagination",
        two: "Second nested item",
      },
    });

    expect(truncated).toContain("...");
    expect(truncated.length).toBeLessThanOrEqual(153);
  });
});

describe("timeTag", () => {
  it("renders a date", async () => {
    render(<div>{timeTag(new Date("1970-08-20").toUTCString())}</div>);

    await waitFor(() => screen.getByText(/1970.*00:00:00/));
  });

  it("can take an empty input string", () => {
    expect(timeTag("")).toEqual("");
  });
});

describe("jsonDisplay", () => {
  it("produces the correct output", () => {
    render(
      jsonDisplay({
        title: "TOML Example (but in JSON)",
      }),
    );

    expect(screen.getByText(/TOML Example \(but in JSON\)/)).toBeInTheDocument();
  });
});

describe("checkboxInputTag", () => {
  it("can be checked", () => {
    render(checkboxInputTag(true));
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("can be unchecked", () => {
    render(checkboxInputTag(false));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("is disabled when checked", () => {
    render(checkboxInputTag(true));
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("is disabled when unchecked", () => {
    render(checkboxInputTag(false));
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});
