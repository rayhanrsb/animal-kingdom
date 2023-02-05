import React, { FC, useEffect, useState } from "react";

const Vote = ({
  organisationName,
  remainingVotes,
  handleVotesChange,
}: {
  organisationName: string;
  remainingVotes: number;
  handleVotesChange: Function;
}) => {
  const [vote, setVote] = useState(0);

  const [maxVotes, setMaxVotes] = useState(vote + remainingVotes);

  const handleVoteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (Number(event.target.value) > maxVotes) {
      setVote(maxVotes);
      handleVotesChange(organisationName, maxVotes);
      return;
    }
    handleVotesChange(organisationName, Number(event.target.value));
    setVote(Number(event.target.value));
  };

  useEffect(() => {
    const newMaxVotes = vote + remainingVotes;
    setMaxVotes(newMaxVotes);
  }, [remainingVotes]);

  return (
    <article className="vote-slider">
      <input
        type="range"
        min="0"
        max="100"
        value={vote}
        onChange={handleVoteChange}
        id={organisationName}
        name={organisationName}
        className="slider"
      />
      <label htmlFor={organisationName}>{vote}</label>
    </article>
  );
};

export default Vote;
