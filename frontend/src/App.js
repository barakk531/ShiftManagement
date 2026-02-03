

import { RouterProvider, createBrowserRouter } from "react-router-dom";

import EditEventPage from "./pages/EditEvent";
import ErrorPage from "./pages/Error";
import EventDetailPage, {
  loader as eventDetailLoader,
  action as deleteEventAction,
} from "./pages/EventDetail";
import EventsPage, { loader as eventsLoader } from "./pages/Events";
import EventsRootLayout, { eventsRootLoader } from "./pages/EventsRoot";
import HomePage from "./pages/Home";
import NewEventPage from "./pages/NewEvent";
import RootLayout from "./pages/Root";
import { action as manipulateEventAction } from "./components/EventForm";
import NewsletterPage, { action as newsletterAction } from "./pages/Newsletter";
import AuthenticationPage, { action as authAction } from "./pages/Authentication";
import { action as logoutAction } from "./pages/Logout";
import { checkAuthLoader, tokenLoader } from "./util/auth";
import CreateAccountPage from "./pages/CreateAccount";
import ForumPage, { forumLoader } from "./pages/Forum";
import History, { historyLoader } from "./pages/History";
import HistoryModern, { historyModernLoader } from "./pages/HistoryModern";

import ShiftSwapsPage, { loader as shiftSwapsLoader } from "./pages/ShiftSwaps/ShiftSwaps";
import NewShiftSwapPage, { action as newShiftSwapAction } from "./pages/ShiftSwaps/NewShiftSwap";
import ShiftSwapDetailsPage, { loader as shiftSwapDetailsLoader } from "./pages/ShiftSwaps/ShiftSwapDetails";
import VerifyEmailPage from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";

import AdminCreateWorkspace from "./pages/SubmissionShifts/AdminCreateWorkspace";
import AdminOperatingHours from "./pages/SubmissionShifts/AdminOperatingHours";
import WorkerSelectWorkspace from "./pages/SubmissionShifts/WorkerSelectWorkspace";
import MyWorkspace from "./pages/SubmissionShifts/MyWorkspace";
import WorkerSubmitAvailability from "./pages/SubmissionShifts/WorkerSubmitAvailability";
import AdminShiftTemplates from "./pages/SubmissionShifts/AdminShiftTemplates";
import SubmissionShiftsRoot from "./pages/SubmissionShifts/SubmissionShiftsRoot";
import AdminScheduleBuilder from "./pages/SubmissionShifts/AdminScheduleBuilder";
import AdminScheduleBoardPage from "./pages/SubmissionShifts/AdminScheduleBoard/AdminScheduleBoardPage";
import PublishedSchedulePage from "./pages/SubmissionShifts/PublishedSchedule/PublishedSchedulePage";


const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    id: "root",
    loader: tokenLoader,
    shouldRevalidate() {
      return true;
    },
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "events",
        element: <EventsRootLayout />,
        loader: eventsRootLoader,
        children: [
          {
            index: true,
            element: <EventsPage />,
            loader: eventsLoader,
          },
          {
            path: ":eventId",
            id: "event-detail",
            loader: eventDetailLoader,
            children: [
              {
                index: true,
                element: <EventDetailPage />,
                action: deleteEventAction,
              },
              {
                path: "edit",
                element: <EditEventPage />,
                action: manipulateEventAction,
                loader: checkAuthLoader,
              },
            ],
          },
          {
            path: "new",
            element: <NewEventPage />,
            action: manipulateEventAction,
            loader: checkAuthLoader,
          },
        ],
      },
      {
        path: "auth",
        element: <AuthenticationPage />,
        action: authAction,
      },
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "newsletter",
        element: <NewsletterPage />,
        action: newsletterAction,
      },
      {
        path: "logout",
        action: logoutAction,
      },
      {
        path: "create-account",
        element: <CreateAccountPage />,
      },
      {
        path: "forum",
        element: <ForumPage />,
        loader: forumLoader,
      },
      {
        path: "history",
        element: <HistoryModern />,
        loader: historyModernLoader,
      },
      {
        path: "history-legacy",
        element: <History />,
        loader: historyLoader,
      },
      {
        path: "shift-swaps",
        element: <ShiftSwapsPage />,
        loader: shiftSwapsLoader,
        children: [
          {
            path: "new",
            element: <NewShiftSwapPage />,
            action: newShiftSwapAction,
          },
          {
            path: ":id",
            element: <ShiftSwapDetailsPage />,
            loader: shiftSwapDetailsLoader,
          },
          {
            path: "verify-email",
            element: <VerifyEmailPage />,
          },
        ],
      },

      // =========================
      // Submission Shifts
      // =========================
      {
        path: "submission-shifts",
        element: <SubmissionShiftsRoot />,
        children: [
          // Default route: /submission-shifts
          // This allows the root guard to run and redirect workers without an active workspace.
          {
            index: true,
            element: <MyWorkspace />,
            loader: checkAuthLoader,
          },

          {
            path: "my-workspace",
            element: <MyWorkspace />,
            loader: checkAuthLoader,
          },
          {
            path: "select-workspace",
            element: <WorkerSelectWorkspace />,
            loader: checkAuthLoader,
          },
          {
            path: "admin/create-workspace",
            element: <AdminCreateWorkspace />,
            loader: checkAuthLoader,
          },
          {
            path: "admin/operating-hours/:id",
            element: <AdminOperatingHours />,
            loader: checkAuthLoader,
          },
          {
            path: "submit-availability",
            element: <WorkerSubmitAvailability />,
            loader: checkAuthLoader,
          },
          {
            path: "admin/shift-templates",
            element: <AdminShiftTemplates />,
            loader: checkAuthLoader,
          },
          {
            path: "admin/schedule-builder",
            element: <AdminScheduleBuilder />,
            loader: checkAuthLoader,
          },
          {
            path: "admin/schedule-board",
            element: <AdminScheduleBoardPage />,
            loader: checkAuthLoader,
          },
          {
            path: "published-schedule",
            element: <PublishedSchedulePage />,
            loader: checkAuthLoader,
          },
        ],
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;




// import { RouterProvider, createBrowserRouter } from 'react-router-dom';

// import EditEventPage from './pages/EditEvent';
// import ErrorPage from './pages/Error';
// import EventDetailPage, {
//   loader as eventDetailLoader,
//   action as deleteEventAction,
// } from './pages/EventDetail';
// import EventsPage, { loader as eventsLoader } from './pages/Events';
// import EventsRootLayout, { eventsRootLoader } from './pages/EventsRoot';
// import HomePage from './pages/Home';
// import NewEventPage from './pages/NewEvent';
// import RootLayout from './pages/Root';
// import { action as manipulateEventAction } from './components/EventForm';
// import NewsletterPage, { action as newsletterAction } from './pages/Newsletter';
// import AuthenticationPage, {action as authAction} from './pages/Authentication';
// import { action as logoutAction } from './pages/Logout';
// import { checkAuthLoader, tokenLoader } from './util/auth';
// import CreateAccountPage from './pages/CreateAccount';
// import ForumPage, { forumLoader } from "./pages/Forum";
// import History, { historyLoader } from "./pages/History";
// import HistoryModern, { historyModernLoader } from "./pages/HistoryModern";

// import ShiftSwapsPage, { loader as shiftSwapsLoader } from "./pages/ShiftSwaps/ShiftSwaps";
// import NewShiftSwapPage, { action as newShiftSwapAction } from "./pages/ShiftSwaps/NewShiftSwap";
// import ShiftSwapDetailsPage, { loader as shiftSwapDetailsLoader } from "./pages/ShiftSwaps/ShiftSwapDetails";
// import VerifyEmailPage from './pages/VerifyEmail';
// import ForgotPassword from "./pages/ForgotPassword";

// import AdminCreateWorkspace from "./pages/SubmissionShifts/AdminCreateWorkspace";
// import AdminOperatingHours from "./pages/SubmissionShifts/AdminOperatingHours";
// import WorkerSelectWorkspace from "./pages/SubmissionShifts/WorkerSelectWorkspace";
// import MyWorkspace from "./pages/SubmissionShifts/MyWorkspace";
// import WorkerSubmitAvailability from "./pages/SubmissionShifts/WorkerSubmitAvailability";
// import AdminShiftTemplates from "./pages/SubmissionShifts/AdminShiftTemplates";
// import SubmissionShiftsRoot from "./pages/SubmissionShifts/SubmissionShiftsRoot";
// import AdminScheduleBuilder from "./pages/SubmissionShifts/AdminScheduleBuilder";
// import AdminScheduleBoardPage from "./pages/SubmissionShifts/AdminScheduleBoard/AdminScheduleBoardPage";


// const router = createBrowserRouter([
//   {
//     path: '/',
//     element: <RootLayout />,
//     errorElement: <ErrorPage />,
//     id: 'root',
//     loader: tokenLoader,
//     shouldRevalidate() {
//       return true;
//     },
//     children: [
//       { index: true, element: <HomePage /> },
//       {
//         path: 'events',
//         element: <EventsRootLayout />,
//         loader: eventsRootLoader,
//         children: [
//           {
//             index: true,
//             element: <EventsPage />,
//             loader: eventsLoader,
//           },
//           {
//             path: ':eventId',
//             id: 'event-detail',
//             loader: eventDetailLoader,
//             children: [
//               {
//                 index: true,
//                 element: <EventDetailPage />,
//                 action: deleteEventAction,
//               },
//               {
//                 path: 'edit',
//                 element: <EditEventPage />,
//                 action: manipulateEventAction,
//                 loader: checkAuthLoader,
//               },
//             ],
//           },
//           {
//             path: 'new',
//             element: <NewEventPage />,
//             action: manipulateEventAction,
//             loader: checkAuthLoader,
//           },
//         ],
//       },
//       {
//         path: 'auth',
//         element: <AuthenticationPage />,
//         action: authAction,
//       },
//       {
//         path: "forgot-password",
//         element: <ForgotPassword />,
//       },
//       {
//         path: 'newsletter',
//         element: <NewsletterPage />,
//         action: newsletterAction,
//       },
//       {
//         path: 'logout',
//         action: logoutAction,
//       },
//       {
//         path: 'create-account',
//         element: <CreateAccountPage />,
//       },

//       {
//         path: "forum",
//         element: <ForumPage />,
//         loader: forumLoader,
//       },
//       {
//         path: "history",
//         element: <HistoryModern />,
//         loader: historyModernLoader,
//       },
//       {
//         path: "history-legacy",
//         element: <History />,
//         loader: historyLoader,
//       },
//       {
//         path: "shift-swaps",
//         element: <ShiftSwapsPage />,
//         loader: shiftSwapsLoader,
//         children: [
//           {
//             path: "new",
//             element: <NewShiftSwapPage />,
//             action: newShiftSwapAction,
//           },
//           {
//             path: ":id",
//             element: <ShiftSwapDetailsPage />,
//             loader: shiftSwapDetailsLoader,
//           },
//           {
//           path: 'verify-email',
//           element: <VerifyEmailPage />,
//           },

//         ],
//       },
// // =========================
// // Submission Shifts (V1)
// // =========================
//       {
//         path: "submission-shifts",
//         element: <SubmissionShiftsRoot />,
//         children: [
//           {
//             path: "my-workspace",
//             element: <MyWorkspace />,
//             loader: checkAuthLoader,
//           },
//           {
//             path: "select-workspace",
//             element: <WorkerSelectWorkspace />,
//             loader: checkAuthLoader,
//           },
//           {
//             path: "admin/create-workspace",
//             element: <AdminCreateWorkspace />,
//             loader: checkAuthLoader,
//           },
//           {
//             path: "admin/operating-hours/:id",
//             element: <AdminOperatingHours />,
//             loader: checkAuthLoader,
//           },
//           {
//             path: "submit-availability",
//             element: <WorkerSubmitAvailability />,
//             loader: checkAuthLoader,
//           },
//           {
//             path: "admin/shift-templates",
//             element: <AdminShiftTemplates />,
//             loader: checkAuthLoader,
//           },
//           {
//             path: "admin/schedule-builder",
//             element: <AdminScheduleBuilder />,
//             loader: checkAuthLoader,
//           },
//           {
//             path: "admin/schedule-board",
//             element: <AdminScheduleBoardPage />,
//             loader: checkAuthLoader,
//           },
//         ],
//       },

//     ],
//   },
// ]);

// function App() {
//   return <RouterProvider router={router} />;
// }

// export default App;
