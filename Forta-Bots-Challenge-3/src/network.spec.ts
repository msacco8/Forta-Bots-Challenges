import { createAddress } from "forta-agent-tools";
import NetworkManager from "./network";
import NetworkData from "./network";

// format: [chainId, daiContract, escrowContract][]
const TEST_CASES: [string, string, string][] = [
  ["11", createAddress("0xa2a"), createAddress("0xb1a")],
  ["22", createAddress("0xa3b"), createAddress("0xb2a")],
  ["33", createAddress("0xa4c"), createAddress("0xb3a")],
];

const generateNetworkMap = (data: [string, string, string]): Record<number, NetworkData> => {
  let networkMap: Record<number, NetworkData> = {};
  let chainId = parseInt(data[0]);

  networkMap[chainId] = {
    chainId,
    daiContract: data[1],
    escrowContract: data[2],
  } as NetworkData;

  return networkMap;
};

describe("NetworkManager test suite", () => {
  it("should return the correct contract addresses for each network", async () => {
    for (let testCase of TEST_CASES) {
      const networkMap: Record<number, NetworkData> = generateNetworkMap(testCase);

      const [network, daiContract, escrowContract] = testCase;
      const networkManager = new NetworkManager(networkMap);
      networkManager.setNetwork(network);

      expect(networkManager.chainId).toStrictEqual(parseInt(network));
      expect(networkManager.daiContract).toStrictEqual(daiContract);
      expect(networkManager.escrowContract).toStrictEqual(escrowContract);
    }
  });

  it("should throw error from using unsupported network", async () => {
    for (let testCase of TEST_CASES) {
      const networkMap: Record<number, NetworkData> = generateNetworkMap(testCase);
      const networkManager = new NetworkManager(networkMap);

      expect(() => {
        // 99 is an unsupported networkId
        networkManager.setNetwork("99");
      }).toThrow(new Error("You are running the bot in a non supported network"));
    }
  });
});
