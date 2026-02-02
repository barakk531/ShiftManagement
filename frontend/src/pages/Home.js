import PageContent from '../components/PageContent';
import { getUserFullName } from "../util/auth";

function HomePage() {
  const fullName = getUserFullName();

  return (
    <PageContent title={`Welcome${fullName ? ` ${fullName}` : ''}!`}>
      <p>Browse all our amazing events!</p>
    </PageContent>
  );
}

export default HomePage;
