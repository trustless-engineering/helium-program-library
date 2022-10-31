import React from "react";
import ReactXnft, { View, Tab, useMetadata } from "react-xnft";
import { Flex } from "./components/common";
import { HotspotIcon, SwapIcon } from "./utils/icons";
import { HotspotsScreen } from "./components/screens/Hotspots";
import { Swap } from "./components/screens/Swap";
import { Notification } from "./components/Notification";
import { NotificationProvider } from "./contexts/notification";
import { THEME } from "./utils/theme";
import { useColorMode } from "./utils/hooks";

//
// On connection to the host environment, warm the cache.
//
ReactXnft.events.on("connect", () => {
  // no-op
});

export const App = () => {
  const metadata = useMetadata();
  const bgAccentColor = useColorMode(THEME.colors.backgroundAccent);

  return (
    <View tw="flex flex-col h-full w-full bg-white dark:bg-zinc-800">
      <NotificationProvider>
        <Notification></Notification>
        <Tab.Navigator
          style={{
            background: bgAccentColor,
            borderTop: "none",
          }}
          options={({ route }) => {
            return {
              tabBarActiveTintColor: "none",
              tabBarInactiveTintColor: "none",
              tabBarStyle: {
                backgroundColor: bgAccentColor,
                border: "none",
              },
              tabBarIcon: ({ focused }) => {
                const color = focused
                  ? metadata.isDarkMode
                    ? THEME.colors.inactiveTab
                    : THEME.colors.activeTab
                  : metadata.isDarkMode
                  ? THEME.colors.activeTab
                  : THEME.colors.inactiveTab;

                if (route.name === "hotspots") {
                  return <Tab.Icon element={<HotspotIcon fill={color} />} />;
                } else {
                  return <Tab.Icon element={<SwapIcon fill={color} />} />;
                }
              },
            };
          }}
        >
          <Tab.Screen name="hotspots" component={() => <HotspotsScreen />} />
          <Tab.Screen name="swap" component={() => <Swap />} />
        </Tab.Navigator>
      </NotificationProvider>
    </View>
  );
};
