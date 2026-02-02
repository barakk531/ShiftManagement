import HomeHero from "../components/HomeHero";
import BackgroundStage from "../components/BackgroundStage";
import { getUserFullName } from "../util/auth";
import { getHomeBgStorageKey } from "../util/userBgKeys";

function HomePage() {
  const fullName = getUserFullName();

  return (
    <BackgroundStage
      storageKey={getHomeBgStorageKey()}
      title="Home background"
      allowPicker={true}
    >
      <HomeHero fullName={fullName} />
    </BackgroundStage>
  );
}

export default HomePage;
