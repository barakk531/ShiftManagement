import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import PageContent from '../components/PageContent';

function ErrorPage() {
  const error = useRouteError();

  let title = 'An error occurred!';
  let message = 'Something went wrong!';

  // If the error comes from a loader/action "throw new Response(...)" or "throw json(...)"
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = 'Not found!';
      message = 'Could not find resource or page.';
    } else if (error.status === 500) {
      message = error.data?.message || error.statusText || message;
    } else {
      message = error.data?.message || error.statusText || message;
    }
  } else if (error instanceof Error) {
    // If it's a normal JS error
    message = error.message;
  }

  return (
    <>
      <PageContent title={title}>
        <p>{message}</p>
      </PageContent>
    </>
  );
}

export default ErrorPage;
