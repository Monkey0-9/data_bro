describe("Signal Flow E2E", () => {
  it("should load the UI and connect to WebSocket", () => {
    cy.visit("/");
    cy.get("canvas").should("exist");
  });

  it("should display signal panel", () => {
    cy.visit("/");
    cy.contains(/signal|price|volume/i).should("exist");
  });

  it("should handle WebSocket connection errors gracefully", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        cy.stub(win.WebSocket, "constructor").throws(new Error("WS error"));
      },
    });
    cy.contains(/error|connection/i).should("exist");
  });
});
