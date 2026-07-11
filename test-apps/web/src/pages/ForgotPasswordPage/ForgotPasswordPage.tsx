"use client";

import { useEffect, useRef } from "react";

import { Form, Label, TextField, Submit, FieldError } from "@/lib/forms";
import { navigate } from "@rwgql/router";
import { routes } from "@/routes";
import { toast, Toaster } from "react-hot-toast";

import { useAuth } from "@/auth";

const ForgotPasswordPage = () => {
  const { isAuthenticated, forgotPassword } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(routes.home());
    }
  }, [isAuthenticated]);

  const usernameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    usernameRef?.current?.focus();
  }, []);

  const onSubmit = async (data: { username: string }) => {
    const response = await forgotPassword(data.username);

    if (response.error) {
      toast.error(response.error);
    } else {
      // The function `forgotPassword.handler` in api/src/functions/auth.js has
      // been invoked, let the user know how to get the link to reset their
      // password (sent in email, perhaps?)
      toast.success("A link to reset your password was sent to " + response.email);
      navigate(routes.login());
    }
  };

  return (
    <>
      <main className="rw-main">
        <Toaster toastOptions={{ className: "rw-toast", duration: 6000 }} />
        <div className="rw-scaffold rw-login-container">
          <div className="rw-segment">
            <header className="rw-segment-header">
              <h2 className="rw-heading rw-heading-secondary">Forgot Password</h2>
            </header>

            <div className="rw-segment-main">
              <div className="rw-form-wrapper">
                <Form onSubmit={onSubmit} className="rw-form-wrapper">
                  <div className="text-left">
                    <Label
                      name="username"
                      className="rw-label"
                      errorClassName="rw-label rw-label-error"
                    >
                      Username
                    </Label>
                    <TextField
                      name="username"
                      className="rw-input"
                      errorClassName="rw-input rw-input-error"
                      ref={usernameRef}
                      validation={{
                        required: {
                          value: true,
                          message: "Username is required",
                        },
                      }}
                    />

                    <FieldError name="username" className="rw-field-error" />
                  </div>

                  <div className="rw-button-group">
                    <Submit className="rw-button rw-button-blue">Submit</Submit>
                  </div>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default ForgotPasswordPage;
