"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [asClass, setAsClass] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const router = useRouter();

  const handleSignUp = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const supabase =
      createClient();

    setIsLoading(true);
    setError(null);

    if (!firstName.trim()) {
      setError(
        "First name is required."
      );
      setIsLoading(false);
      return;
    }

    if (!lastName.trim()) {
      setError(
        "Last name is required."
      );
      setIsLoading(false);
      return;
    }

    if (!asClass) {
      setError(
        "AS class is required."
      );
      setIsLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setError(
        "Passwords do not match."
      );
      setIsLoading(false);
      return;
    }

    try {
      const {
        error: signUpError,
      } =
        await supabase.auth.signUp({
          email,
          password,

          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`,

            data: {
              account_type:
                "cadet",

              first_name:
                firstName.trim(),

              last_name:
                lastName.trim(),

              as_class:
                Number(asClass),
            },
          },
        });

      if (signUpError) {
        throw signUpError;
      }

      router.push(
        "/auth/sign-up-success"
      );
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during sign up."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        className
      )}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Create Cadet Account
          </CardTitle>

          <CardDescription>
            Create your Det 055 Inventory account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">
                    First Name
                  </Label>

                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) =>
                      setFirstName(
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="lastName">
                    Last Name
                  </Label>

                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) =>
                      setLastName(
                        e.target.value
                      )
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="asClass">
                  AS Class
                </Label>

                <select
                  id="asClass"
                  value={asClass}
                  onChange={(e) =>
                    setAsClass(
                      e.target.value
                    )
                  }
                  required
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">
                    Select AS class...
                  </option>

                  <option value="100">
                    AS 100
                  </option>

                  <option value="200">
                    AS 200
                  </option>

                  <option value="250">
                    AS 250
                  </option>

                  <option value="300">
                    AS 300
                  </option>

                  <option value="400">
                    AS 400
                  </option>
                </select>

                <p className="text-xs text-muted-foreground">
                  GMC/POC will be determined automatically.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">
                  Email
                </Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">
                  Password
                </Label>

                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="repeat-password">
                  Repeat Password
                </Label>

                <Input
                  id="repeat-password"
                  type="password"
                  value={
                    repeatPassword
                  }
                  onChange={(e) =>
                    setRepeatPassword(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading
                  ? "Creating account..."
                  : "Create Account"}
              </Button>
            </div>

            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="underline underline-offset-4"
              >
                Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}