export const Router = () => {
  return (
    <Router>
      <Set private>
        <Route path={"/" + "home"} name="home" page={HomePage} />
        <Route path="/login" name="login" page={LoginPage} />
        <Route path="/404" name="404" page={() => '404 - Not Found.'} />
      </Set>
    </Router>
  )
}
