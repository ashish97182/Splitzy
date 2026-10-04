import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo2 from "../assets/logo2.png";
import loginBackground from "../assets/background.png";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      return;
    }

    login({
      name: normalizedEmail.split("@")[0],
      email: normalizedEmail,
    });
    navigate("/dashboard");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed bg-no-repeat"
      style={{ backgroundImage: `url(${loginBackground})` }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-8 shadow-lg">
        <img
          src={logo2}
          alt="SPLITZY logo"
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-auto w-[92%] max-w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] object-contain opacity-[0.16]"
        />

        <div className="relative z-10">
          <div aria-hidden="true" className="h-[144px]" />

          <p className="mt-2 text-center text-gray-500 font-bold text-lg">
            Login to your account
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button type="submit" className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700">
            Login
          </button>

          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
