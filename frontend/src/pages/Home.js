import HomeHero from "../components/HomeHero";
import BackgroundStage from "../components/BackgroundStage";
import { getUserFullName } from "../util/auth";
import { getHomeBgStorageKey } from "../util/userBgKeys";
import { useRouteLoaderData } from "react-router-dom";

function HomePage() {
  const token = useRouteLoaderData("root");
  const fullName = token ? getUserFullName() : "";


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
