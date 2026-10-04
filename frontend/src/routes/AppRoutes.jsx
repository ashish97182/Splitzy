import { Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Groups from "../pages/Groups";
import Expenses from "../pages/Expenses";
import Settlements from "../pages/Settlements";
import NotFound from "../pages/NotFound";
import DashboardLayout from "../layouts/DashboardLayout";
import GroupDetails from "../pages/GroupDetails";
import ProtectedRoute from "./ProtectedRoute";

function AppRoutes() {
    return (
        <Routes>

            {/* Public Routes */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Dashboard Routes */}
            <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/groups" element={<Groups />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/settlements" element={<Settlements />} />
                    <Route
                        path="/groups/:groupId"
                        element={<GroupDetails />}
                    />
                </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />

        </Routes>
    );
}

export default AppRoutes;
