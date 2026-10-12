"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import { ApiError, api } from "@/lib/api";
import { saveSession, type AuthUser } from "@/lib/auth-storage";

type FieldErrors = {
  phone?: string;
  password?: string;
};

type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

function normalizePhone(value: string) {
  return value.replace(/[\s\-()]/g, "");
}

function validate(phone: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const cleaned = normalizePhone(phone);

  if (!cleaned) {
    errors.phone = "Enter your phone number.";
  } else if (!/^\+?[0-9]{10,15}$/.test(cleaned)) {
    errors.phone = "Enter a valid phone number (10–15 digits).";
  }

  if (!password) {
    errors.password = "Enter your password.";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const nextErrors = validate(phone, password);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.post<LoginResponse>("/auth/login", {
        phone: normalizePhone(phone),
        password,
      });

      if (data.user.role !== "CEO" && data.user.role !== "ADMIN") {
        setFormError("This portal is for CEO accounts only.");
        return;
      }

      saveSession(data.accessToken, data.user);
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError(
          "Cannot reach the server. Make sure the backend is running on port 4000.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col gap-4"
      noValidate
    >
      {formError ? (
        <div
          role="alert"
          className="rounded-md border border-error/30 bg-error-bg px-3 py-3 text-sm text-error"
        >
          {formError}
        </div>
      ) : null}

      <TextField
        name="phone"
        label="Phone number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="e.g. 9999999999"
        value={phone}
        onChange={(event) => {
          setPhone(event.target.value);
          if (errors.phone) {
            setErrors((current) => ({ ...current, phone: undefined }));
          }
        }}
        error={errors.phone}
        hint="Default seed CEO phone: 9999999999"
      />

      <PasswordField
        name="password"
        label="Password"
        autoComplete="current-password"
        placeholder="Enter your password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          if (errors.password) {
            setErrors((current) => ({ ...current, password: undefined }));
          }
        }}
        error={errors.password}
        hint="Default seed password: Ceo@12345"
      />

      <p className="text-sm text-text-secondary">
        Forgot password? Email OTP reset comes in a later step.
      </p>

      <div className="mt-auto pt-2">
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Sign in
        </Button>
      </div>
    </form>
  );
}
