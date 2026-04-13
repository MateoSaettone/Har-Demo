# Responding to Yili Ren's feedback

> "Your project is interesting. But it may require the user to always carry the smartphone. You may want to justify it in your report and presentation."

## Framing for the report / presentation

**Short version:** yes, the system assumes the phone is on the person. This assumption is reasonable in practice, acknowledged as a limitation, and mitigable with commonly-used wearables.

### Arguments to include
1. **Phone carry is the norm.** Pew and similar surveys consistently show >80% of adults carry their phone on them most of the day. For most target applications (fitness tracking, fall monitoring, step counting) the phone is already present.
2. **Target applications tolerate the assumption.** Clinical mobility monitoring, daily step count, and commute-time activity inference all assume the person has their phone. We're not claiming 24/7 passive monitoring without any device.
3. **Failure mode is graceful.** If the phone is on a desk, the model sees "stationary/unknown" — it doesn't hallucinate activity. We can demonstrate this.
4. **Natural extension to wearables.** The same sensor modalities (accel + gyro) exist on smartwatches and fitness bands, which *are* worn continuously. Our pipeline would transfer with only a re-training step. We flag this as future work.
5. **Alternatives have their own costs.** Ambient sensing (Wi-Fi CSI, cameras, PIR) either requires infrastructure, raises privacy concerns, or doesn't follow the user outdoors. Phone-based HAR has the best cost/coverage/privacy profile for many use cases.

### Limitations we should openly acknowledge
- Phone location matters: pocket vs. hand vs. bag changes signal. UCI HAR used waist-mounted — we should say how we handle (or don't) this distribution shift.
- Leaving the phone on a table gives no signal.
- One phone per user → no multi-person settings.

### One-line for the presentation
"We acknowledge the system requires the phone to be on the user's person, which aligns with real usage patterns for the fitness and health applications we target; the same approach extends directly to continuously-worn smartwatches."

## Bonus: demo-time proof
During the live demo, briefly show what happens when the phone is set on the table (prediction stabilizes on "standing/stationary") — turns the limitation into a feature of the demo.
