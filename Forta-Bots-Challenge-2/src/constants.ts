export const UNISWAP_FACTORY_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
export const UNISWAP_INIT_CODE = "0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54";
export const SWAP_EVENT =
  "event Swap(address indexed sender,address indexed recipient,int256 amount0,int256 amount1,uint160 sqrtPriceX96,uint128 liquidity,int24 tick)";
export const ERC20_ABI = ["function symbol() external view returns (string)"];
export const UNISWAP_POOL_ABI = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function fee() external view returns (uint24)",
];
