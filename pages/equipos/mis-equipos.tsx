import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: "/equipos", permanent: true },
});

export default function MisEquiposRedirect() {
  return null;
}