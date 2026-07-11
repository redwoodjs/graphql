import { defineRoutes, Private, Route, Router, Set } from "@rwgql/router/routes";

import BlogLayout from "@/layouts/BlogLayout/BlogLayout";
import ScaffoldLayout from "@/layouts/ScaffoldLayout/ScaffoldLayout";
import AboutPage from "@/pages/AboutPage/AboutPage";
import BlogPostPage from "@/pages/BlogPostPage/BlogPostPage";
import ContactPage from "@/pages/Contact/ContactPage/ContactPage";
import ContactsPage from "@/pages/Contact/ContactsPage/ContactsPage";
import EditContactPage from "@/pages/Contact/EditContactPage/EditContactPage";
import NewContactPage from "@/pages/Contact/NewContactPage/NewContactPage";
import ContactUsPage from "@/pages/ContactUsPage/ContactUsPage";
import DoublePage from "@/pages/DoublePage/DoublePage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage/ForgotPasswordPage";
import HomePage from "@/pages/HomePage/HomePage";
import LoginPage from "@/pages/LoginPage/LoginPage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";
import EditPostPage from "@/pages/Post/EditPostPage/EditPostPage";
import NewPostPage from "@/pages/Post/NewPostPage/NewPostPage";
import PostPage from "@/pages/Post/PostPage/PostPage";
import PostsPage from "@/pages/Post/PostsPage/PostsPage";
import ProfilePage from "@/pages/ProfilePage/ProfilePage";
import ResetPasswordPage from "@/pages/ResetPasswordPage/ResetPasswordPage";
import SignupPage from "@/pages/SignupPage/SignupPage";
import WaterfallPage from "@/pages/WaterfallPage/WaterfallPage";

const routeTree = (
  <Router>
    <Route path="/double" page={DoublePage} name="double" cache />
    <Route path="/login" page={LoginPage} name="login" />
    <Route path="/signup" page={SignupPage} name="signup" />
    <Route path="/forgot-password" page={ForgotPasswordPage} name="forgotPassword" />
    <Route
      path="/reset-password"
      name="resetPassword"
      render={(requestInfo) => {
        const resetToken = new URL(requestInfo.request.url).searchParams.get("resetToken") ?? "";
        return <ResetPasswordPage resetToken={resetToken} />;
      }}
    />
    <Set
      wrap={ScaffoldLayout}
      title="Contacts"
      titleTo="contacts"
      buttonLabel="New Contact"
      buttonTo="newContact"
    >
      <Private unauthenticated="login">
        <Route path="/contacts/new" page={NewContactPage} name="newContact" />
        <Route path="/contacts/{id:Int}/edit" page={EditContactPage} name="editContact" />
        <Route path="/contacts/{id:Int}" page={ContactPage} name="contact" />
        <Route path="/contacts" page={ContactsPage} name="contacts" />
      </Private>
    </Set>
    <Set
      wrap={ScaffoldLayout}
      title="Posts"
      titleTo="posts"
      buttonLabel="New Post"
      buttonTo="newPost"
    >
      <Private unauthenticated="login">
        <Route path="/posts/new" page={NewPostPage} name="newPost" />
        <Route path="/posts/{id:Int}/edit" page={EditPostPage} name="editPost" />
        <Route path="/posts/{id:Int}" page={PostPage} name="post" />
        <Route path="/posts" page={PostsPage} name="posts" />
      </Private>
    </Set>
    <Set wrap={BlogLayout} cache>
      <Route path="/waterfall/{id:Int}" page={WaterfallPage} name="waterfall" />
      <Private unauthenticated="login">
        <Route path="/profile" page={ProfilePage} name="profile" />
      </Private>
      <Route path="/blog-post/{id:Int}" page={BlogPostPage} name="blogPost" />
      <Route path="/contact" page={ContactUsPage} name="contactUs" cache={false} />
      <Route path="/about" page={AboutPage} name="about" />
      <Route path="/" page={HomePage} name="home" />
      <Route notfound page={NotFoundPage} />
    </Set>
  </Router>
);

export default defineRoutes(routeTree);

export { routes, type WebRouteName } from "@/routes";
