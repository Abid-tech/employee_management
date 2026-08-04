import { Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/header/header'
import Footer from './components/footer/footer'
import HolidayManagement from './pages/holiday_management/holiday_management'

function App() {

  return (
    <>
      <div className="d-flex flex-column min-vh-100">
      <Header/>
      <div className="flex-grow-1">
        <Routes>
          {/* Holiday Management is now the only (and default) page */}
          <Route path='/' element={<HolidayManagement/>}/>
        </Routes>
      </div>
      <Footer/>
      </div>
    </>
  )
}

export default App
