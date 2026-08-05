import { useState } from 'react'
import { Route,Routes } from 'react-router-dom'
import './App.css'
import Header from './components/header/header'
import Footer from './components/footer/footer'
import Home from './pages/home/home'
import Leave from './pages/Leave_management/leave_management'
import AdminDashboard from './pages/admin_dashboard/admin_dashboard'
function App() {
 

  return (
    <>
      <div className="d-flex flex-column min-vh-100">
      <Header/>
      <div className="flex-grow-1">
        <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path='/Leave-management' element={<Leave/>}/>
          <Route path='/admin-dashboard' element={<AdminDashboard/>}/>
        </Routes>
      </div>
      <Footer/>
      </div>
    </>
  )
}

export default App
