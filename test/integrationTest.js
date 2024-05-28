require("mocha-steps");
const supertest = require("supertest");
const assert = require("assert");
const HttpServer = require("../lib/httpServer");
const Blockchain = require("../lib/blockchain");
const Operator = require("../lib/operator");
const Miner = require("../lib/miner");
const Node = require("../lib/node");
const fs = require("fs-extra");

const logLevel = 0;

require("../lib/util/consoleWrapper.js")("integrationTest", logLevel);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("Integration Test", () => {
  const name1 = "integrationTest1";
  const name2 = "integrationTest2";

  const createNaivecoin = (name, host, port, peers, removeData = true) => {
    if (removeData) {
      fs.removeSync("data/" + name + "/");
    }

    let blockchain = new Blockchain(name);
    let operator = new Operator(name, blockchain);
    let miner = new Miner(blockchain, logLevel);
    let node = new Node(host, port, peers, blockchain);
    let httpServer = new HttpServer(node, blockchain, operator, miner);

    return httpServer.listen(host, port);
  };

  const walletPassword = "t t t t t";
  let context = {};

  step("start server 1", async () => {
    context.httpServer1 = await createNaivecoin(name1, "localhost", 3001, []);
  });

  step("create wallet", async () => {
    const res = await supertest(context.httpServer1.app)
      .post("/operator/wallets")
      .send({ password: walletPassword })
      .expect(201);

    context.walletId = res.body.id;
  });

  step("create address 1", async () => {
    const res = await supertest(context.httpServer1.app)
      .post(`/operator/wallets/${context.walletId}/addresses`)
      .set({ password: walletPassword })
      .expect(201);

    context.address1 = res.body.address;
  });

  step("create address 2", async () => {
    const res = await supertest(context.httpServer1.app)
      .post(`/operator/wallets/${context.walletId}/addresses`)
      .set({ password: walletPassword })
      .expect(201);

    context.address2 = res.body.address;
  });

  step("mine an empty block", async () => {
    await supertest(context.httpServer1.app)
      .post("/miner/mine")
      .send({ rewardAddress: context.address1 })
      .expect(201);
  });

  step("create a transaction", async () => {
    const res = await supertest(context.httpServer1.app)
      .post(`/operator/wallets/${context.walletId}/transactions`)
      .set({ password: walletPassword })
      .send({
        fromAddress: context.address1,
        toAddress: context.address2,
        amount: 1000000000,
        changeAddress: context.address1,
      })
      .expect(201);

    context.transactionId = res.body.id;
  });

  step("mine a block with transactions", async () => {
    await supertest(context.httpServer1.app)
      .post("/miner/mine")
      .send({ rewardAddress: context.address1 })
      .expect(201);
  });

  step("check confirmations for the created transaction", async () => {
    await supertest(context.httpServer1.app)
      .get(`/node/transactions/${context.transactionId}/confirmations`)
      .expect(200)
      .expect((res) => {
        assert.equal(
          res.body.confirmations,
          1,
          `Expected confirmations of transaction '${context.transactionId}' to be '1'`
        );
      });
  });

  step("check address 1 balance", async () => {
    await supertest(context.httpServer1.app)
      .get(`/operator/${context.address1}/balance`)
      .expect(200)
      .expect((res) => {
        assert.equal(
          res.body.balance,
          9000000000,
          `Expected balance of address '${context.address1}' to be '9000000000'`
        );
      });
  });

  step("check address 2 balance", async () => {
    await supertest(context.httpServer1.app)
      .get(`/operator/${context.address2}/balance`)
      .expect(200)
      .expect((res) => {
        assert.equal(
          res.body.balance,
          1000000000,
          `Expected balance of address '${context.address2}' to be '1000000000'`
        );
      });
  });

  step("check unspent transaction from address 1", async () => {
    await supertest(context.httpServer1.app)
      .get("/blockchain/transactions/unspent")
      .query({ address: context.address1 })
      .expect(200)
      .expect((res) => {
        assert.equal(
          res.body.length,
          3,
          `Expected unspent transactions of address '${context.address1}' to be '3'`
        );
      });
  });

  step("start server 2", async () => {
    return createNaivecoin(name2, "localhost", 3002, [
      { url: "http://localhost:3001" },
    ]).then((httpServer) => {
      context.httpServer2 = httpServer;
    });
  });

  step("wait for nodes synchronization", async () => {
    await sleep(1e3);
  });

  step("check blockchain size in server 2", async () => {
    await supertest(context.httpServer2.app)
      .get("/blockchain/blocks")
      .expect(200)
      .expect((res) => {
        assert.equal(
          res.body.length,
          3,
          "Expected blockchain size of 3 on server 2"
        );
      });
  });

  step(
    "check confirmations from server 1 for the created transaction",
    async () => {
      await supertest(context.httpServer1.app)
        .get(`/node/transactions/${context.transactionId}/confirmations`)
        .expect(200)
        .expect((res) => {
          assert.equal(
            res.body.confirmations,
            2,
            `Expected confirmations of transaction '${context.transactionId}' to be '2'`
          );
        });
    }
  );

  step(
    "check confirmations from server 2 for the created transaction",
    async () => {
      await supertest(context.httpServer2.app)
        .get(`/node/transactions/${context.transactionId}/confirmations`)
        .expect(200)
        .expect((res) => {
          assert.equal(
            res.body.confirmations,
            2,
            `Expected confirmations of transaction '${context.transactionId}' to be '2'`
          );
        });
    }
  );

  step("create a new transaction", async () => {
    const res = await supertest(context.httpServer1.app)
      .post(`/operator/wallets/${context.walletId}/transactions`)
      .set({ password: walletPassword })
      .send({
        fromAddress: context.address1,
        toAddress: context.address2,
        amount: 1000000000,
        changeAddress: context.address1,
      })
      .expect(201);
    context.transactionId = res.body.id;
  });

  step("wait for nodes synchronization", async () => {
    await sleep(1e3);
  });

  step("check transactions", async () => {
    const res = await supertest(context.httpServer1.app)
      .get("/blockchain/transactions")
      .expect(200)
      .expect((res) => {
        assert.equal(
          res.body.length,
          1,
          `Expected transactions size of '${context.transactionId}' to be '1'`
        );
      });

    context.transactionId = res.body.id;
  });

  step("check address 1 balance", async () => {
    await supertest(context.httpServer1.app)
      .get(`/operator/${context.address1}/balance`)
      .expect(200)
      .expect((res) => {
        assert.equal(
          res.body.balance,
          7999999999,
          `Expected balance of address '${context.address1}' to be '7999999999'`
        );
      });
  });

  step("stop server 2", async () => {
    await context.httpServer2.stop();
    fs.removeSync("data/" + name2 + "/");
  });

  // Complementary tests to reach untested paths
  describe("Complementary tests", () => {
    step("get wallets", async () => {
      await supertest(context.httpServer1.app)
        .get("/operator/wallets")
        .expect(200)
        .expect((res) => {
          assert.equal(res.body.length, 1, "Expected 1 wallet.");
          assert.equal(
            res.body[0].addresses.length,
            2,
            "Expected 2 addresses."
          );
        });
    });

    step("get wallet addresses", async () => {
      await supertest(context.httpServer1.app)
        .get(`/operator/wallets/${context.walletId}/addresses`)
        .expect(200)
        .expect((res) => {
          assert.equal(res.body.length, 2, "Expected 2 addresses.");
        });
    });

    step("get wallet", async () => {
      await supertest(context.httpServer1.app)
        .get(`/operator/wallets/${context.walletId}`)
        .expect(200)
        .expect((res) => {
          assert.equal(res.body.addresses.length, 2, "Expected 2 addresses.");
        });
    });

    step("restart server 1", async () => {
      await context.httpServer1.stop();
      const httpServer = await createNaivecoin(
        name1,
        "localhost",
        3001,
        [],
        false
      );

      context.httpServer1 = httpServer;
    });

    step("get latest block", async () => {
      const res = await supertest(context.httpServer1.app)
        .get("/blockchain/blocks/latest")
        .expect(200);

      context.latestBlock = {
        hash: res.body.hash,
        index: res.body.index,
      };
    });

    step("get block by hash", async () => {
      await supertest(context.httpServer1.app)
        .get(`/blockchain/blocks/${context.latestBlock.hash}`)
        .expect(200)
        .expect((res) => {
          assert.equal(
            res.body.hash,
            context.latestBlock.hash,
            `Expected hash of block index '${context.latestBlock.index}' to be '${context.latestBlock.hash}'`
          );
        });
    });

    step("get block by index", async () => {
      await supertest(context.httpServer1.app)
        .get(`/blockchain/blocks/${context.latestBlock.index}`)
        .expect(200)
        .expect((res) => {
          assert.equal(
            res.body.index,
            context.latestBlock.index,
            `Expected index of block hash '${context.latestBlock.hash}' to be '${context.latestBlock.index}'`
          );
        });
    });

    step("create a new transaction with more value than funds", async () => {
      await supertest(context.httpServer1.app)
        .post(`/operator/wallets/${context.walletId}/transactions`)
        .set({ password: walletPassword })
        .send({
          fromAddress: context.address1,
          toAddress: context.address2,
          amount: 8000000000,
          changeAddress: context.address1,
        })
        .expect(400);
    });

    describe("get the pages", () => {
      it("should get the blockchain page", async () => {
        await supertest(context.httpServer1.app)
          .get("/blockchain")
          .set("Accept", "text/html")
          .expect("Content-Type", /html/)
          .expect(200);
      });

      it("should not get the blockchain json", async () => {
        await supertest(context.httpServer1.app)
          .get("/blockchain")
          .set("Accept", "application/json")
          .expect(400);
      });

      it("should get the unconfirmed transactions page", async () => {
        await supertest(context.httpServer1.app)
          .get("/blockchain/transactions")
          .set("Accept", "text/html")
          .expect("Content-Type", /html/)
          .expect(200);
      });
    });

    describe("force errors", async () => {
      it("should not get the block by hash", async () => {
        await supertest(context.httpServer1.app)
          .get(
            "/blockchain/blocks/1111111111111111111111111111111111111111111111111111111111111111"
          )
          .expect(404);
      });

      it("should not get the block by index", async () => {
        await supertest(context.httpServer1.app)
          .get("/blockchain/blocks/1000")
          .expect(404);
      });

      it("should not get the transaction by ID from the blockchain", async () => {
        await supertest(context.httpServer1.app)
          .get(
            "/blockchain/blocks/transactions/1111111111111111111111111111111111111111111111111111111111111111"
          )
          .expect(404);
      });

      it("should not create a wallet with no password", async () => {
        await supertest(context.httpServer1.app)
          .post("/operator/wallets")
          .send({ password: "" })
          .expect(400);
      });

      it("should not get the wallet", async () => {
        await supertest(context.httpServer1.app)
          .get("/operator/wallets/a")
          .expect(404);
      });

      it("should not get the addresses of a inexistent wallet", async () => {
        await supertest(context.httpServer1.app)
          .get("/operator/wallets/a/addresses")
          .expect(400);
      });

      it("should not create a transaction with missing password", async () => {
        await supertest(context.httpServer1.app)
          .post(`/operator/wallets/${context.walletId}/transactions`)
          .send({
            fromAddress: context.address1,
            toAddress: context.address2,
            amount: 1000000000,
            changeAddress: context.address1,
          })
          .expect(401);
      });

      it("should not create a transaction with invalid password", async () => {
        await supertest(context.httpServer1.app)
          .post(`/operator/wallets/${context.walletId}/transactions`)
          .set({ password: "wrong one" })
          .send({
            fromAddress: context.address1,
            toAddress: context.address2,
            amount: 1000000000,
            changeAddress: context.address1,
          })
          .expect(403);
      });

      it("should not create a wallet address without a password", async () => {
        await supertest(context.httpServer1.app)
          .post(`/operator/wallets/${context.walletId}/addresses`)
          .expect(401);
      });

      it("should not create a wallet address with a wrong password", async () => {
        await supertest(context.httpServer1.app)
          .post(`/operator/wallets/${context.walletId}/addresses`)
          .set({ password: "wrong one" })
          .expect(403);
      });

      it("should not create a wallet address with a wrong wallet ID", async () => {
        await supertest(context.httpServer1.app)
          .post("/operator/wallets/A/addresses")
          .set({ password: walletPassword })
          .expect(400);
      });

      it("should not get the address balance because no transactions were found", async () => {
        await supertest(context.httpServer1.app)
          .get("/operator/A/balance")
          .expect(404);
      });
    });

    step("stop server 1", async () => {
      await context.httpServer1.stop();
      fs.removeSync("data/" + name1 + "/");
    });
  });
});
