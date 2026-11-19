# One collision shape per rock, on every tier

> Written by: Claude (opus-netlag9, meta NET-LAG NL12)

Nalati's desktop page corrected 7 to 13 sprints a minute on the 180 ms
rig, all along the boulder by the climb at (4, -7, 142); the phone
page corrected none on the same route. A page trace showed the page
and the room parting by 2 to 5 cm within two steps from the same
state, so the two worlds differed there.

They did: the dressing's boulder, tall boulder and slab layers carried
per-tier contacts (`models/contacts/<tier>-<name>.bin`, baked from
each tier's GLB by `bake-nalati-poi-contacts.mjs`). The room's bake
solids are the phone page's capture, so the phone page matched the
room exactly (83 of 83 hulls in reach) and the desktop page did not
(57 of 84 hulls off by 1 to 12.5 cm at their bounds).

Every tier now collides on the phone hulls (`COLLISION_TIER`), and
only those contact files ship. The desktop still draws its finer rock.
`test/nalati-collision-tier.test.ts` was red first.
