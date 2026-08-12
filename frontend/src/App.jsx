import { useState } from 'react'
import { Route,Routes } from 'react-router-dom'
import './App.css'
import Header from './components/header/header'
import Footer from './components/footer/footer'
import Home from './pages/home/home'
import Leave from './pages/Leave_management/leave_management'
import AdminDashboard from './pages/admin_dashboard/admin_dashboard'
// --- Module 3: Task & Objective Management ---------------------------------
import Module3Layout from './pages/module3_layout'
import TaskOrbit from './pages/task_orbit/task_orbit'
import TaskDetail from './pages/task_detail/task_detail'
import NewTask from './pages/new_task/new_task'
import Projects from './pages/projects/projects'
import ProjectDetail from './pages/projects/project_detail'
// ---------------------------------------------------------------------------
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
          {/* --- Module 3 -------------------------------------------------
              Wrapped in a layout route so every page inside gets the .m3
              scope its stylesheet depends on. */}
          <Route element={<Module3Layout/>}>
            <Route path='/tasks' element={<TaskOrbit/>}/>
            <Route path='/tasks/new' element={<NewTask/>}/>
            <Route path='/tasks/:id' element={<TaskDetail/>}/>
            <Route path='/projects' element={<Projects/>}/>
            <Route path='/projects/:id' element={<ProjectDetail/>}/>
          </Route>
          {/* --------------------------------------------------------------- */}
        </Routes>
      </div>
      <Footer/>
      </div>
    </>
  )
}

export default App
