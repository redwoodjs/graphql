"use client";

import type { ComponentPropsWithoutRef, FormEvent, ForwardedRef, ReactNode } from "react";
import { forwardRef } from "react";
import type { FieldValues, RegisterOptions, UseFormReturn } from "react-hook-form";
import { FormProvider, useForm, useFormContext } from "react-hook-form";

export type RWGqlError = Error | undefined;

type ValidationRule = {
  readonly message?: string;
  readonly value?: boolean;
};

type FieldValidation = {
  readonly pattern?: {
    readonly message?: string;
    readonly value: RegExp;
  };
  readonly required?: boolean | ValidationRule;
};

type FieldValueMap = Record<string, string | number>;
type FieldRegisterOptions = RegisterOptions<FieldValueMap, string>;

type FormProps<T extends FieldValues> = Omit<ComponentPropsWithoutRef<"form">, "onSubmit"> & {
  readonly children: ReactNode;
  readonly config?: Parameters<typeof useForm<T>>[0];
  readonly error?: RWGqlError;
  readonly formMethods?: UseFormReturn<T>;
  readonly onSubmit: (data: T) => void | Promise<void>;
};

export const Form = <T extends FieldValues>({
  children,
  config,
  formMethods,
  onSubmit,
  ...props
}: FormProps<T>) => {
  const fallbackMethods = useForm<T>(config);
  const methods = formMethods ?? fallbackMethods;

  return (
    <FormProvider {...methods}>
      <form
        {...props}
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          void methods.handleSubmit(onSubmit)(event);
        }}
      >
        {children}
      </form>
    </FormProvider>
  );
};

type InputProps = Omit<ComponentPropsWithoutRef<"input">, "name"> & {
  readonly errorClassName?: string;
  readonly name: string;
  readonly validation?: FieldValidation;
};

const toRegisterOptions = (
  validation: FieldValidation | undefined,
  inputType?: ComponentPropsWithoutRef<"input">["type"],
): FieldRegisterOptions => {
  const required =
    typeof validation?.required === "object"
      ? (validation.required.message ?? validation.required.value)
      : validation?.required;
  const requiredOption = required === undefined ? {} : { required };

  if (inputType === "number") {
    return { ...requiredOption, valueAsNumber: true };
  }

  if (!validation?.pattern) {
    return requiredOption;
  }

  const pattern = validation.pattern.message
    ? {
        message: validation.pattern.message,
        value: validation.pattern.value,
      }
    : validation.pattern.value;

  return { ...requiredOption, pattern };
};

const InputField = forwardRef(function InputField(
  { errorClassName: _errorClassName, name, validation, ...props }: InputProps,
  ref: ForwardedRef<HTMLInputElement>,
) {
  const methods = useFormContext<FieldValueMap>();
  const registered = methods.register(name, toRegisterOptions(validation, props.type));

  return (
    <input
      {...props}
      {...registered}
      ref={(element) => {
        registered.ref(element);
        if (typeof ref === "function") {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      }}
    />
  );
});

export const TextField = InputField;
export const PasswordField = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <InputField {...props} ref={ref} type="password" />
));
export const NumberField = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <InputField {...props} ref={ref} type="number" />
));

type TextAreaProps = Omit<ComponentPropsWithoutRef<"textarea">, "name"> & {
  readonly errorClassName?: string;
  readonly name: string;
  readonly validation?: FieldValidation;
};

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ errorClassName: _errorClassName, name, validation, ...props }, ref) => {
    const methods = useFormContext<FieldValueMap>();
    const registered = methods.register(name, toRegisterOptions(validation));

    return (
      <textarea
        {...props}
        {...registered}
        ref={(element) => {
          registered.ref(element);
          if (typeof ref === "function") {
            ref(element);
          } else if (ref) {
            ref.current = element;
          }
        }}
      />
    );
  },
);

export const Submit = (props: ComponentPropsWithoutRef<"button">) => (
  <button {...props} type={props.type ?? "submit"} />
);

export const Label = ({
  errorClassName: _errorClassName,
  name,
  ...props
}: ComponentPropsWithoutRef<"label"> & {
  readonly errorClassName?: string;
  readonly name: string;
}) => <label {...props} htmlFor={name} />;

export const FieldError = ({
  className,
  name,
}: {
  readonly className?: string;
  readonly name: string;
}) => {
  const {
    formState: { errors },
  } = useFormContext();
  const error = errors[name];

  if (!error) {
    return null;
  }

  const message = typeof error.message === "string" ? error.message : "Required";

  return <span className={className}>{message}</span>;
};

export const FormError = ({
  error,
  listClassName: _listClassName,
  titleClassName,
  wrapperClassName,
}: {
  readonly error?: RWGqlError;
  readonly listClassName?: string;
  readonly titleClassName?: string;
  readonly wrapperClassName?: string;
}) => {
  if (!error) {
    return null;
  }

  return (
    <div className={wrapperClassName}>
      <p className={titleClassName}>{error.message}</p>
    </div>
  );
};
