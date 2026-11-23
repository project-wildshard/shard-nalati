# Give the standalone Ring 2 runner its normal job envelope

In run 45198753065 the hosted build took seven minutes and the runner
cancelled the shared cooked-world proof five minutes after it began.
The primary Ring 2 job in 45197745868 passed that same proof. Give the
standalone job the primary job's 35-minute setup, build and play envelope.
The test itself keeps its existing 15-minute deadline and all assertions.
