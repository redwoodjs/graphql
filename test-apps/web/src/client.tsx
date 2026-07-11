import "virtual:vite-preamble";

import { initClient, initClientNavigation } from "rwsdk/client";

const { handleResponse, onHydrated } = initClientNavigation();

void initClient({ handleResponse, onHydrated });
