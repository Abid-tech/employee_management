import Header from "./header/header";
import Footer from "./footer/footer";
import { Outlet } from "react-router-dom";

function Layout({ user, setUser }) {
    return (
        <div className="d-flex flex-column min-vh-100">
            <Header
                user={user}
                setUser={setUser}
            />

            <div className="flex-grow-1">
                <Outlet />
            </div>

            <Footer />
        </div>
    );
}

export default Layout;