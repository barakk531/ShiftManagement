import { useLoaderData } from "react-router-dom";

import ShiftSwapItem from "./ShiftSwapItem";
import classes from './ShiftSwapsList.module.css';


function ShiftSwapsList() {
    const posts = useLoaderData() || [];


    return (
        <>
            {posts.length > 0 && (
            <ul className={classes.posts}>
                {posts.map((p) => (
                <ShiftSwapItem
                    key={p.id}
                    id={p.id}
                    author={p.author}
                    body={p.body}
                    shiftStartAt={p.shiftStartAt}
                />
                ))}
            </ul>
            )}
            {posts.length === 0 && (
                <div style={{textAlign: 'center', color: 'white'}}>
                    <h2>There are no posts yet.</h2>
                    <p>Start adding some!</p>
                </div>
            )}

        </>
    );
}

export default ShiftSwapsList;