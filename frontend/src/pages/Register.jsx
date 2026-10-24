import { useState } from "react";
import { Link } from "react-router-dom";
import logo2 from "../assets/logo2.png";
import loginBackground from "../assets/background.png";
import { registerUser } from "../services/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const validate = () => {
    const nextErrors = {};
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();

    if (!normalizedName) nextErrors.name = "Enter your full name.";
    if (!normalizedEmail) nextErrors.email = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(normalizedEmail)) nextErrors.email = "Enter a valid email address.";
    if (!password) nextErrors.password = "Enter a password.";
    else if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!confirmPassword) nextErrors.confirmPassword = "Confirm your password.";
    else if (password !== confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError("");
    setRegistered(false);

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    try {
      await registerUser({ name: name.trim(), email: email.trim(), password });
      setRegistered(true);
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setErrors({});
    } catch (error) {
      setApiError(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "We couldn't create your account. Check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = "w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-y-auto px-4 py-8">
      <div
        aria-hidden="true"
        className="login-background-image pointer-events-none absolute inset-0 z-0"
        style={{ backgroundImage: `url(${loginBackground})` }}
      />
      <div aria-hidden="true" className="login-background-overlay pointer-events-none absolute inset-0 z-0" />

      <div className="relative z-10 my-auto w-full max-w-md overflow-hidden rounded-2xl bg-white p-8 shadow-lg">
        <img
          src={logo2}
          alt="DostiDue logo"
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[190px] z-0 h-auto w-[92%] max-w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] object-contain opacity-[0.16]"
        />

        <div className="relative z-10">
          <div aria-hidden="true" className="h-20" />
          <h1 className="brand-gradient text-center text-3xl font-bold">Create Account</h1>
          <p className="mt-2 text-center text-gray-500">Join DostiDue</p>

          {registered && (
            <div role="status" className="mt-4 rounded-lg border border-green-300/30 bg-green-500/10 p-3 text-sm text-green-200">
              Account created successfully. You can now log in.
            </div>
          )}
          {apiError && (
            <div role="alert" className="mt-4 rounded-lg border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-200">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="register-name" className="sr-only">Full Name</label>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                placeholder="Full Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "register-name-error" : undefined}
                className={fieldClass}
              />
              {errors.name && <p id="register-name-error" className="mt-1 text-sm text-red-300">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="register-email" className="sr-only">Email Address</label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="Email Address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "register-email-error" : undefined}
                className={fieldClass}
              />
              {errors.email && <p id="register-email-error" className="mt-1 text-sm text-red-300">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="register-password" className="sr-only">Password</label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                placeholder={`Password (at least ${MIN_PASSWORD_LENGTH} characters)`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "register-password-error" : undefined}
                className={fieldClass}
              />
              {errors.password && <p id="register-password-error" className="mt-1 text-sm text-red-300">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="sr-only">Confirm Password</label>
              <input
                id="register-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? "register-confirm-password-error" : undefined}
                className={fieldClass}
              />
              {errors.confirmPassword && <p id="register-confirm-password-error" className="mt-1 text-sm text-red-300">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {isSubmitting ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Already have an account? <Link to="/login" className="font-semibold text-blue-800 hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
