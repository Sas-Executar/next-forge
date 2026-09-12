import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useColorScheme } from "@/components/use-color-scheme";
import Colors from "@/constants/colors";

/**
 * Core navigation (M08-T04) — mirrors a subset of SPEC-WORKSPACE-001's
 * web IA: Agora (/now), Projetos (/projects), Copiloto (/copilot),
 * Mapa-OS (/mapa-os), Reports (/reports). Not the full 17-route web IA
 * — a phone-sized subset, matching the plan's own wording ("core
 * navigation mirroring web IA subset"). Scanner (M09-T03/T04) is the
 * one tab with no web equivalent — the Visual Symbol Scanner is
 * mobile-only by design (PRD-SCANNER-001).
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: Colors[colorScheme].tint }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Agora",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "bolt.fill", android: "bolt", web: "bolt" }}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projetos",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "folder.fill", android: "folder", web: "folder" }}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="copilot"
        options={{
          title: "Copiloto",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "message.fill", android: "chat", web: "chat" }}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scanner",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "camera.viewfinder",
                android: "qr_code_scanner",
                web: "qr_code_scanner",
              }}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mapa-os"
        options={{
          title: "Mapa-OS",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: "map.fill", android: "map", web: "map" }}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "doc.text.fill",
                android: "description",
                web: "description",
              }}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Config",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: "gearshape.fill",
                android: "settings",
                web: "settings",
              }}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
