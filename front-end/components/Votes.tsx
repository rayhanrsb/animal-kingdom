import { useState } from "react";
import Vote from "./Vote";

const Votes = ({
  election,
  handleVote,
  nft,
}: {
  election: object;
  handleVote: Function;
  nft: object;
}) => {
  const [votes, setVotes] = useState<object>({});
  const [remainingVotes, setRemainingVotes] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  const handleVotesChange = (organisation: string, amount: number) => {
    const newObject = { ...votes, [organisation as keyof object]: amount };
    let usedUpVotes = 0;
    for (const organisation in newObject) {
      usedUpVotes += newObject[organisation];
    }
    setVotes(newObject);
    setRemainingVotes(100 - usedUpVotes);
  };

  const handleVoteClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    setSubmitting(true);
    handleVote(votes, nft, Number(election.date), election);
  };

  const objToArr = (obj: object) => {
    let arrToReturn: any[] = [];
    for (const key in obj) {
      arrToReturn = [...arrToReturn, obj[key as keyof object]];
    }
    return arrToReturn;
  };

  const snakeToTitleCase = (string: string): string => {
    return string
      .split("_")
      .map((word) => {
        return word.slice(0, 1).toUpperCase() + word.slice(1);
      })
      .join(" ");
  };

  return (
    <section className="votes">
      <p className={remainingVotes >= 0 ? "medium-green" : "red"}>
        Remaining votes: {remainingVotes}
      </p>
      {objToArr(election.organisations).map((organisation) => (
        <article
          key={election.date.toString() + organisation.name.toString()}
          className="input-vote"
        >
          <p>{snakeToTitleCase(organisation.name.toString())}</p>
          <Vote
            organisationName={organisation.name}
            remainingVotes={remainingVotes}
            handleVotesChange={handleVotesChange}
          />
        </article>
      ))}
      <button
        className={
          remainingVotes >= 0
            ? "medium-green-background white"
            : "red-background white"
        }
        onClick={handleVoteClick}
        disabled={remainingVotes < 0 || submitting}
      >
        {submitting ? "Submitting..." : "Submit vote"}
      </button>
    </section>
  );
};

export default Votes;
