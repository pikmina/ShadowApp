const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the default route logic to respect role access
code = code.replace(
  '<Route index element={<Navigate to="/rules" replace />} />',
  `        <Route index element={
          <RequireAuth>
            {() => {
               // Dynamic index redirect based on role
               // We need a wrapper component to use the hook safely
               return <IndexRedirector />;
            }}
          </RequireAuth>
        } />`
);

// We'll inject IndexRedirector component above AppRoutes
const indexRedirectorStr = `
function IndexRedirector() {
  const { dbUser } = useAuth();
  const role = dbUser?.role || "player";
  
  if (role === "superadmin") {
    return <Navigate to="/rules" replace />;
  }
  return <Navigate to="/my-sheet" replace />;
}
`;

code = code.replace('function AppRoutes() {', indexRedirectorStr + '\nfunction AppRoutes() {');

// Fix the RequireAuth component usage in Route since we passed a function
code = code.replace(
`        <Route index element={
          <RequireAuth>
            {() => {
               // Dynamic index redirect based on role
               // We need a wrapper component to use the hook safely
               return <IndexRedirector />;
            }}
          </RequireAuth>
        } />`,
`<Route index element={<IndexRedirector />} />`
);


fs.writeFileSync('src/App.tsx', code);
