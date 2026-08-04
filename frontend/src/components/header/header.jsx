import "../../index.css"
import {Link} from 'react-router-dom'

function Header(){

    return(
        <>
            <nav className="navbar navbar-expand-lg">
                <div className="container">
                    <Link className="navbar-brand" to="/"><h4>Holiday Manager</h4></Link>
                </div>
            </nav>
        </>
    )
}

export default Header