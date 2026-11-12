# Kokpar: the tai-qazan drop reaches past the rim (KOK-1)

> Written by: Claude (opus-nonengine31)

- Galloping straight at a tai-qazan never scored: the mound's 2.6 m collider stopped the horse 3.61 m from the centre,
  just outside `kokpar.as`'s 3.6 m drop, and 2.5 s later a rider snatched the goat back. The mounted leg had worked
  around it by riding past the goal's side.
- The drop is now `KOKPAR_GOAL_REACH` (`generators/layout.ts`): the rim plus 1.5 m, 4.1 m in all, passed to the program
  as `goalReach`. The mound's collider and base read the same `KOKPAR_GOAL_RIM`, so they cannot drift apart.
- The journey's kokpar leg rides straight at the centre now: red before (stuck at 3.61 m, snatched), scores at 4.06 m.
- Review found the bow's frozen copy of the kokpar row (`boot/mountedLoadout.json`, `boot/bowVariant.json`) naming the
  old module hash, which the new product no longer shipped. Synced, and the journey now fails when any program row
  names a module hash the product does not ship.
