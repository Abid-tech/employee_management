import { Route,Routes } from 'react-router-dom'
import './App.css'
import Header from './components/header/header'
import Footer from './components/footer/footer'
import Home from './pages/home/home'
import Leave from './pages/Leave_management/leave_management'
import BookRoom from './pages/BookRoom/BookRoom'
import AddRoom from './pages/AddRoom/AddRoom'
import AdminDashboard from './pages/admin_dashboard/admin_dashboard'
// --- Module 3: Task & Objective Management ---------------------------------
import Module3Layout from './pages/module3_layout'
import TaskOrbit from './pages/task_orbit/task_orbit'
import TaskDetail from './pages/task_detail/task_detail'
import NewTask from './pages/new_task/new_task'
import Projects from './pages/projects/projects'
import ProjectDetail from './pages/projects/project_detail'
// ---------------------------------------------------------------------------
// --- Module 4: Employee Performance Management ------------------------------
import PerformanceLayout from './pages/performance/performance_layout'
import Performance from './pages/performance/performance'
import PerformanceProfile from './pages/performance/performance_profile'
import PerformanceReport from './pages/performance/performance_report'
import PerformanceRebalance from './pages/performance/performance_rebalance'
// ---------------------------------------------------------------------------
// --- Module 5: Employee Feedback & Evaluation -------------------------------
import FeedbackLayout from './pages/feedback/feedback_layout'
import Feedback from './pages/feedback/feedback'
import FeedbackProfile from './pages/feedback/feedback_profile'
import FeedbackWrite from './pages/feedback/feedback_write'
import FeedbackCalibration from './pages/feedback/feedback_calibration'
import FeedbackReconciliation from './pages/feedback/feedback_reconciliation'
import FeedbackAgent from './pages/feedback/feedback_agent'
import FeedbackTrust from './pages/feedback/feedback_trust'
// ---------------------------------------------------------------------------
// --- Module 6: Project Budget Tracker ---------------------------------------
import BudgetLayout from './pages/budget/budget_layout'
import Budget from './pages/budget/budget'
import BudgetProject from './pages/budget/budget_project'
import BudgetClock from './pages/budget/budget_clock'
import BudgetRates from './pages/budget/budget_rates'
import BudgetAdvisor from './pages/budget/budget_advisor'
import BudgetSimulate from './pages/budget/budget_simulate'
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
            <Route path='/book-room' element={<BookRoom/>}/>
            <Route path='/add-room' element={<AddRoom/>}/>
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

          {/* --- Module 4 -------------------------------------------------
              Same pattern as Module 3: a layout route so every page inside
              gets the .perf scope its stylesheet depends on. */}
            <Route element={<PerformanceLayout/>}>
            <Route path='/performance' element={<Performance/>}/>
            <Route path='/performance/reports' element={<PerformanceReport/>}/>
            <Route path='/performance/rebalance' element={<PerformanceRebalance/>}/>
            <Route path='/performance/employee/:id' element={<PerformanceProfile/>}/>
            </Route>

          {/* --- Module 5 -------------------------------------------------
              Wrapped so every page inside gets the .fb scope its stylesheet
              depends on, and shares the "acting as" context the audit trail
              needs. */}
            <Route element={<FeedbackLayout/>}>
            <Route path='/feedback' element={<Feedback/>}/>
            <Route path='/feedback/write' element={<FeedbackWrite/>}/>
            <Route path='/feedback/calibration' element={<FeedbackCalibration/>}/>
            <Route path='/feedback/reconciliation' element={<FeedbackReconciliation/>}/>
            <Route path='/feedback/agent' element={<FeedbackAgent/>}/>
            <Route path='/feedback/trust' element={<FeedbackTrust/>}/>
            <Route path='/feedback/employee/:id' element={<FeedbackProfile/>}/>
            </Route>

          {/* --- Module 6 — scoped under .bud ------------------------------ */}
            <Route element={<BudgetLayout/>}>
            <Route path='/budget' element={<Budget/>}/>
            <Route path='/budget/clock' element={<BudgetClock/>}/>
            <Route path='/budget/simulate' element={<BudgetSimulate/>}/>
            <Route path='/budget/advisor' element={<BudgetAdvisor/>}/>
            <Route path='/budget/rates' element={<BudgetRates/>}/>
            <Route path='/budget/project/:id' element={<BudgetProject/>}/>
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
