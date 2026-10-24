import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo2 from "../assets/logo2.png";
import loginBackground from "../assets/background.png";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to log in. Check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative isolate min-h-screen flex items-center justify-center px-4 py-8">
      <div aria-hidden="true" className="login-background-image pointer-events-none absolute inset-0 z-0" style={{ backgroundImage: `url(${loginBackground})` }} />
      <div aria-hidden="true" className="login-background-overlay pointer-events-none absolute inset-0 z-0" />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white p-8 shadow-lg">
        <img src={logo2} alt="DostiDue logo" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-auto w-[92%] max-w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] object-contain opacity-[0.16]" />
        <div className="relative z-10">
          <div aria-hidden="true" className="h-[144px]" />
          <p className="mt-2 text-center text-gray-500 font-bold text-lg">Login to your account</p>
          {error && <p role="alert" className="mt-4 rounded-lg border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-70">{isSubmitting ? "Logging in…" : "Login"}</button>
          </form>
          <p className="mt-5 text-center text-sm text-gray-500">Don’t have an account? <Link to="/register" className="font-semibold text-blue-800 hover:underline">Sign Up</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
