import "../../index.css"
import {Link} from 'react-router-dom'

function Header(){


    return(
        <>
            <nav className="navbar navbar-expand-lg">
                <div className="container">
                    <Link className="navbar-brand" to="/"><h4>CompanyBooster</h4></Link>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarSupportedContent">
                        <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
                            <li className="nav-item">
                                <Link className="nav-link" to="/admin-dashboard">Admin dashboard</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/">Employee dashboard</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/Leave-management">Leave management</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/tasks">Task orbit</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/projects">Projects</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/performance">Performance</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/">Attendence</Link>
                            </li>
                           
                        </ul>
              
                    </div>
                </div>
            </nav>
        
        </>
    )
}

export default Header