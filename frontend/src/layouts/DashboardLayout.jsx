import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

function DashboardLayout() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="min-h-screen bg-gray-100">

            {/* Sidebar */}
            <aside className="splitzy-sidebar fixed left-0 top-0 z-40 flex h-screen w-64 flex-col shadow-md max-lg:static max-lg:h-auto max-lg:w-full max-lg:flex-row max-lg:flex-wrap max-lg:items-center">
                <div className="flex items-center gap-3 p-6 max-lg:p-4">
                    <img
                        src={logo}
                        alt="SPLITZY logo"
                        className="block h-12 w-12 rounded-full object-cover"
                    />
                    <h1 className="sidebar-brand-name">SPLITZY</h1>
                </div>

                <nav className="space-y-2 px-4 max-lg:flex max-lg:flex-wrap max-lg:gap-1 max-lg:space-y-0">

                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `block rounded-lg px-4 py-3 font-medium max-lg:px-3 max-lg:py-2 ${isActive
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-600 hover:bg-gray-50"
                            }`
                        }
                    >
                        Dashboard
                    </NavLink>

                    <NavLink
                        to="/groups"
                        className={({ isActive }) =>
                            `block rounded-lg px-4 py-3 font-medium max-lg:px-3 max-lg:py-2 ${isActive
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-600 hover:bg-gray-50"
                            }`
                        }
                    >
                        Groups
                    </NavLink>

                    <NavLink
                        to="/expenses"
                        className={({ isActive }) =>
                            `block rounded-lg px-4 py-3 font-medium max-lg:px-3 max-lg:py-2 ${isActive
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-600 hover:bg-gray-50"
                            }`
                        }
                    >
                        Expenses
                    </NavLink>

                    <NavLink
                        to="/settlements"
                        className={({ isActive }) =>
                            `block rounded-lg px-4 py-3 font-medium max-lg:px-3 max-lg:py-2 ${isActive
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-600 hover:bg-gray-50"
                            }`
                        }
                    >
                        Settlements
                    </NavLink>

                </nav>

                <div className="mt-auto p-4 max-lg:ml-auto max-lg:mt-0 max-lg:p-3">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left font-semibold text-red-700 transition hover:bg-red-100 max-lg:w-auto max-lg:px-3 max-lg:py-2"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 min-h-screen max-lg:ml-0">

                {/* Navbar */}
                <header className="splitzy-navbar flex h-16 items-center justify-between px-8 shadow-sm max-sm:min-h-16 max-sm:h-auto max-sm:flex-wrap max-sm:gap-3 max-sm:px-4 max-sm:py-3">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Dashboard
                    </h2>

                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                            N
                        </div>

                        <span className="font-medium text-gray-700">
                            User
                        </span>
                    </div>
                </header>

                {/* Page */}
                <section className="p-8 max-lg:p-0">
                    <Outlet />
                </section>

            </main>
        </div>
    );
}

export default DashboardLayout;
