import { useState } from 'react'
import { Route,Routes } from 'react-router-dom'
import './App.css'
import Header from './components/header/header'
import Footer from './components/footer/footer'
import Home from './pages/home/home'
import Leave from './pages/Leave_management/leave_management'
import BookRoom from './pages/BookRoom/BookRoom'
import AddRoom from './pages/AddRoom/AddRoom'
import MeetingSetup from './pages/MeetingSetup/MeetingSetup'
import MeetingHost from './pages/MeetingHost/MeetingHost'
import MeetingParticipant from './pages/MeetingParticipant/MeetingParticipant'
import AdminResources from "./pages/admin_dashboard/AdminResources"
import EmployeeResources from "./pages/employee_dashboard/EmployeeResources"
import AssetManagement from "./pages/admin_dashboard/AssetManagement";
import MyAssets from "./pages/employee_dashboard/MyAssets"
function App() {
 

  return (
    <>
      <div className="d-flex flex-column min-vh-100">
      <Header/>
      <div className="flex-grow-1">
        <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path='/Leave-management' element={<Leave/>}/>
          <Route path='/book-room' element={<BookRoom/>}/>
          <Route path='/add-room' element={<AddRoom/>}/>
          <Route path="/meeting/create" element={<MeetingSetup />} />
          <Route path="/meeting/:meetingId/host" element={<MeetingHost />} />
          <Route path="/meeting/:meetingId" element={<MeetingParticipant />} />
          <Route path="/admin/resources" element={<AdminResources />}/>
          <Route path="/employee/resources" element={<EmployeeResources />}/>
          <Route path="/admin/assets" element={<AssetManagement />} />
          <Route path="/employee/assets" element={<MyAssets />} />
        </Routes>
      </div>
      <Footer/>
      </div>
    </>
  )
}

export default App
