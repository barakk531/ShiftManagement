import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import EditEventPage from './pages/EditEvent';
import ErrorPage from './pages/Error';
import EventDetailPage, {
  loader as eventDetailLoader,
  action as deleteEventAction,
} from './pages/EventDetail';
import EventsPage, { loader as eventsLoader } from './pages/Events';
import EventsRootLayout, { eventsRootLoader } from './pages/EventsRoot';
import HomePage from './pages/Home';
import NewEventPage from './pages/NewEvent';
import RootLayout from './pages/Root';
import { action as manipulateEventAction } from './components/EventForm';
import NewsletterPage, { action as newsletterAction } from './pages/Newsletter';
import AuthenticationPage, {action as authAction} from './pages/Authentication';
import { action as logoutAction } from './pages/Logout';
import { checkAuthLoader, tokenLoader } from './util/auth';
import CreateAccountPage from './pages/CreateAccount';
import ForumPage, { forumLoader } from "./pages/Forum";
import History, { historyLoader } from "./pages/History";
import HistoryModern, { historyModernLoader } from "./pages/HistoryModern";

import ShiftSwapsPage, { loader as shiftSwapsLoader } from "./pages/ShiftSwaps/ShiftSwaps";
import NewShiftSwapPage, { action as newShiftSwapAction } from "./pages/ShiftSwaps/NewShiftSwap";
import ShiftSwapDetailsPage, { loader as shiftSwapDetailsLoader } from "./pages/ShiftSwaps/ShiftSwapDetails";
import VerifyEmailPage from './pages/VerifyEmail';



const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    id: 'root',
    loader: tokenLoader,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'events',
        element: <EventsRootLayout />,
        loader: eventsRootLoader,
        children: [
          {
            index: true,
            element: <EventsPage />,
            loader: eventsLoader,
          },
          {
            path: ':eventId',
            id: 'event-detail',
            loader: eventDetailLoader,
            children: [
              {
                index: true,
                element: <EventDetailPage />,
                action: deleteEventAction,
              },
              {
                path: 'edit',
                element: <EditEventPage />,
                action: manipulateEventAction,
                loader: checkAuthLoader,
              },
            ],
          },
          {
            path: 'new',
            element: <NewEventPage />,
            action: manipulateEventAction,
            loader: checkAuthLoader,
          },
        ],
      },
      {
        path: 'auth',
        element: <AuthenticationPage />,
        action: authAction,
      },
      {
        path: 'newsletter',
        element: <NewsletterPage />,
        action: newsletterAction,
      },
      {
        path: 'logout',
        action: logoutAction,
      },
      {
        path: 'create-account',
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
          path: 'verify-email',
          element: <VerifyEmailPage />,
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
