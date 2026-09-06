import { useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const userName = localStorage.getItem("userName");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");

    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 shadow-lg shadow-indigo-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <h1 className="flex items-center gap-2 text-lg font-bold text-white">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-lg backdrop-blur-sm"
            aria-hidden
          >
            🚀
          </span>
          AI Interview Coach
        </h1>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/analytics")}
            className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25 active:scale-95"
          >
            📊 Analytics
          </button>

          <span className="hidden text-sm text-indigo-100 sm:inline">
            Welcome, <span className="font-semibold text-white">{userName}</span>
          </span>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25 active:scale-95"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
