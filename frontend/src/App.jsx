import { Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/header/header'
import Footer from './components/footer/footer'
import HolidayManagement from './pages/holiday_management/holiday_management'
import AddEmployee from './pages/add_employee/add_employee'
import AdminCalendar from './pages/admin_calendar/admin_calendar'
import EmployeeCalendar from './pages/employee_calendar/employee_calendar'

function App() {
  return (
    <>
      <div className="d-flex flex-column min-vh-100">
        <Header />
        <div className="flex-grow-1">
          <Routes>
            <Route path='/' element={<HolidayManagement />} />
            <Route path='/employees' element={<AddEmployee />} />
            <Route path='/admin-calendar' element={<AdminCalendar />} />
            <Route path='/employee-calendar' element={<EmployeeCalendar />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </>
  )
}

export default App
