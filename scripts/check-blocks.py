import json, urllib.request, sys

NODE = "https://mainnet-node.decentralchain.io"
VALIDATOR = "3DWrrgHCrVFvutBuLcPtmtMDfEJZ82V2uaN"

# Get current height
height = json.loads(urllib.request.urlopen(f"{NODE}/blocks/height").read())["height"]
print(f"Current height: {height}")

# Fetch last 100 blocks in batches (API may limit range)
start = height - 100
blocks = []
batch_size = 50
for i in range(start, height + 1, batch_size):
    end = min(i + batch_size - 1, height)
    url = f"{NODE}/blocks/headers/seq/{i}/{end}"
    resp = urllib.request.urlopen(url).read()
    data = json.loads(resp)
    if isinstance(data, list):
        blocks.extend(data)
    else:
        print(f"Unexpected response for {i}-{end}: {str(data)[:200]}")

if len(blocks) < 2:
    print("Not enough blocks returned")
    sys.exit(1)

# Analyze generators
generators = {}
for b in blocks:
    g = b.get("generator", "unknown")
    generators[g] = generators.get(g, 0) + 1

total = len(blocks)
time_span_s = (blocks[-1]["timestamp"] - blocks[0]["timestamp"]) / 1000
blocks_per_day = total / time_span_s * 86400 if time_span_s > 0 else 0

print(f"\nBlocks {blocks[0]['height']}-{blocks[-1]['height']} ({total} blocks over {time_span_s:.0f}s)")
print(f"Block time: ~{time_span_s/(total-1):.1f}s avg")
print(f"Est blocks/day: ~{blocks_per_day:.0f}")
print()
print("Block generators:")
for g, count in sorted(generators.items(), key=lambda x: -x[1]):
    pct = count / total * 100
    marker = " <-- YOUR NODE" if g == VALIDATOR else ""
    print(f"  {g}: {count} blocks ({pct:.1f}%){marker}")

# Check effective balances of top generators
print("\nEffective balances of generators:")
for g in sorted(generators.keys(), key=lambda x: -generators[x]):
    try:
        eff = json.loads(urllib.request.urlopen(f"{NODE}/addresses/effectiveBalance/{g}").read())
        bal_dcc = eff["balance"] / 1e8
        print(f"  {g}: {bal_dcc:,.2f} DCC")
    except:
        print(f"  {g}: (failed to fetch)")

# Estimate APY
# On Waves-derived chains, block reward comes from transaction fees
# Block generation probability is proportional to effective balance / total staked
print("\n--- Reward Estimation ---")
total_effective = 0
for g in generators:
    try:
        eff = json.loads(urllib.request.urlopen(f"{NODE}/addresses/effectiveBalance/{g}").read())
        total_effective += eff["balance"]
    except:
        pass

validator_eff = 0
try:
    resp = json.loads(urllib.request.urlopen(f"{NODE}/addresses/effectiveBalance/{VALIDATOR}").read())
    validator_eff = resp["balance"]
except:
    pass

print(f"Your node effective balance: {validator_eff/1e8:,.2f} DCC")
print(f"Observed generating stake (sample): {total_effective/1e8:,.2f} DCC")
if validator_eff > 0 and total_effective > 0:
    share = validator_eff / total_effective
    est_blocks_per_day = blocks_per_day * share
    print(f"Your share of generation: {share*100:.4f}%")
    print(f"Est blocks your node generates/day: ~{est_blocks_per_day:.2f}")
