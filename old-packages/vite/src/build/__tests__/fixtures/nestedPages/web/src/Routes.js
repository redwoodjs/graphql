// In this file, all Page components from 'src/pages` are auto-imported. Nested
// directories are supported, and should be uppercase. Each subdirectory will be
// prepended onto the component name.
//
// Examples:
//
// 'src/pages/HomePage/HomePage.js'         -> HomePage
// 'src/pages/Admin/BooksPage/BooksPage.js' -> AdminBooksPage

// Private is deprecated, but we still want to test it so we don't break
// people's projects that still use it.
import { Private, Route, Router, Set } from '@redwoodjs/router'

import AdminLayout from 'src/layouts/AdminLayout/AdminLayout'
import MainLayout from 'src/layouts/MainLayout/MainLayout'

import JobsPage from 'src/pages/Jobs/JobsPage'
import JobPage from 'src/pages/Jobs/JobPage'
import NewJobPage from 'src/pages/Jobs/NewJobPage'
import EditJobPage, { NonDefaultExport } from 'src/pages/Jobs/EditJobPage'
import BazingaJobProfilePageWithFunnyName from 'src/pages/Jobs/JobProfilePage'
import NewJobProfilePage from 'src/pages/Jobs/NewJobProfilePage'
import EditJobProfilePage from 'src/pages/Jobs/EditJobProfilePage'
import AllJobsPage from 'src/pages/Jobs/AllJobsPage'
import AllJobProfilesPage from 'src/pages/Jobs/AllJobProfilesPage'

const Routes = () => {
  console.log(NonDefaultExport)
  return (
    <Router>
      <Set wrap={MainLayout}>
        <Route path="/login" page={LoginPage} name="login" />
        <Route path="/signup" page={SignupPage} name="signup" />
        <Route path="/jobs/new" page={NewJobPage} name="newJob" />
        <Route path="/jobs/all" page={AllJobsPage} name="allJobs" />
        <Route path="/jobs/{id:Int}" page={JobPage} name="job" />
        <Route path="/jobs/{id:Int}/edit" page={EditJobPage} name="editJob" />
        <Route path="/jobs" page={JobsPage} name="jobs" />
        <Route path="/job-profiles/new" page={NewJobProfilePage} name="newJobProfile" />
        <Route path="/job-profiles/all" page={AllJobProfilesPage} name="allJobProfiles" />
        <Route path="/job-profiles/{id:Int}" page={BazingaJobProfilePageWithFunnyName} name="jobProfile" />
        <Route path="/job-profiles/{id:Int}/edit" page={EditJobProfilePage} name="editJobProfile" />

        <Route path="/" page={HomePage} name="home" />

        <Route notfound page={NotFoundPage} />
      </Set>

      <Private unauthenticated={'home'}>
        <Set wrap={[AdminLayout]} role={'admin'}>
          <Route path="/admin/users/new" page={AdminUserNewUserPage} name="newUser" />
          <Route path="/admin/users/{id:Int}/edit" page={AdminUserEditUserPage} name="editUser" />
          <Route path="/admin/users/{id:Int}" page={AdminUserUserPage} name="user" />
          <Route path="/admin/users" page={AdminUserUsersPage} name="users" />
        </Set>

      </Private>
    </Router>
  )
}

export default Routes
