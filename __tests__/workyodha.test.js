const http = require("http");
const app = require("../server");

function request(server, path, options = {}) {
  const address = server.address();
  const body = options.body ? JSON.stringify(options.body) : null;

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

describe("WorkYodha task board API", () => {
  let server;

  beforeAll((done) => {
    server = app.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  test("returns an active organizational board with computed labor cost", async () => {
    const response = await request(server, "/api/workyodha/board");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.board.tasks).toHaveLength(8);
    expect(response.body.board.totals.totalCost).toBeGreaterThan(0);
    expect(response.body.board.departments.map((department) => department.name)).toContain("Operations");
  });

  test("updates a task and evidence status", async () => {
    const response = await request(server, "/api/workyodha/tasks/task-001", {
      method: "PATCH",
      body: {
        status: "In Review",
        evidence: [{ id: "ev-002", status: "Approved" }],
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.task.status).toBe("In Review");
    expect(response.body.task.evidence.find((item) => item.id === "ev-002").status).toBe("Approved");
  });
});
